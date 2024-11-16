from PIL import Image
from ultralytics import YOLO
import math
import torchvision.transforms as T
import style_canvas_utils as scu


def process_face_image(image):
    """
    Process an image by resizing, converting to tensor, and normalizing.
    This function expects a PIL.Image as input and returns a normalized tensor.

    Returns:
    torch.Tensor: The processed image tensor, ready for model input.
    """
    # Define the transformation pipeline
    transformation_pipeline = T.Compose([
        T.ToTensor(),                      # Convert the image to a tensor
        T.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))  # Normalize the tensor
    ])
    
    # Apply the transformations
    processed_image = transformation_pipeline(image)
    return processed_image

class InferenceImageProcessor:
    def __init__(self, img_width=4096, img_height=4096):
        self.img_width = img_width
        self.img_height = img_height
        self.resize = T.Resize((img_height, img_width))
        self.transforms = T.Compose([
            T.ToTensor(),  # Convert image to tensor
        ])
        self.model = YOLO('./Resize_Model_Weights/yolov8n.pt', verbose=False)

    def calculate_image_dimensions(self, img_width, img_height):
        divisions_width = math.ceil(math.log2(self.img_width / img_width)) if self.img_width > img_width else 0
        divisions_height = math.ceil(math.log2(self.img_height / img_height)) if self.img_height > img_height else 0
        divisions = max(divisions_width, divisions_height)
        new_width = self.img_width // (2 ** divisions)
        new_height = self.img_height // (2 ** divisions)
        return new_width, new_height

    def resize_object_to_fit(self, obj_width, obj_height, target_width, target_height):
        target_ratio = target_width / target_height
        object_ratio = obj_width / obj_height

        if object_ratio > target_ratio:
            new_width = min(obj_width, target_width - 1)
            new_height = int(new_width / object_ratio)
        else:
            new_height = min(obj_height, target_height - 1)
            new_width = int(new_height * object_ratio)
        
        return new_width, new_height

    def crop_and_resize_image(self, img):
        results = self.model(img)
        img_width, img_height = img.size
        target_width, target_height = self.calculate_image_dimensions(img_width, img_height)

        if len(results[0].boxes) > 0:
            box = results[0].boxes[0].xyxy[0].cpu().numpy()
            left, top, right, bottom = map(int, box)
            pixel_outset = 10
            left_offset = max(0, left - pixel_outset)
            top_offset = max(0, top - pixel_outset)
            right_offset = min(img_width, right + pixel_outset)
            bottom_offset = min(img_height, bottom + pixel_outset)

            obj = img.crop((left_offset, top_offset, right_offset, bottom_offset))

            obj_width = obj.width
            obj_height = obj.height
            new_width, new_height = self.resize_object_to_fit(obj_width, obj_height, target_width, target_height)

            new_img = Image.new("RGBA", (target_width, target_height), (255, 255, 255, 255))
            obj_resized = obj.resize((new_width, new_height), Image.LANCZOS)

            if obj_resized.mode != 'RGBA':
                obj_resized = obj_resized.convert('RGBA')

            new_img.paste(obj_resized, ((target_width - new_width) // 2, (target_height - new_height) // 2), obj_resized)

            return new_img.convert('RGB')
        else:
            print("No object detected.")
            return None

    def is_aspect_ratio_match(self, image):
        img_width, img_height = image.size
        img_aspect_ratio = img_width / img_height
        default_aspect_ratio = self.img_width / self.img_height

        if img_width <  self.img_width or img_height < self.img_height:
            raise ValueError(f"Image dimensions should be at least {self.img_width} x {self.img_height}")

        if img_aspect_ratio != default_aspect_ratio:
            return self.crop_and_resize_image(image)
        else:
            return image

    def process_image_path(self, image_path):
        input_image = scu.load_image(image_path)
        return self.process_image(input_image)

    def process_image(self, input_image):
        input_image = scu.rotate_image_based_on_exif(input_image)        
        input_image = self.is_aspect_ratio_match(input_image)
        input_image = scu.normalize_images(input_image)
        
        if input_image.mode != 'RGB':
            input_image = input_image.convert('RGB')

        if input_image.size != (self.img_width, self.img_height):
            input_image = self.resize(input_image)

        # Convert the image into a tensor
        input_image = self.transforms(input_image)
        input_image = input_image.unsqueeze(0)  # Add batch dimension
        
        return input_image

