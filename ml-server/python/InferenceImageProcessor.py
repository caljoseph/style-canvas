import os
from PIL import Image
from tqdm import tqdm
from ultralytics import YOLO
from natsort import natsorted
import math
import torchvision.transforms as T
import numpy as np
import matplotlib.pyplot as plt
import FaceDetectorLib as FCL
from ImageSaver import ImageSaver
import reuseablecustompythonfunctions as rcpf

def load_image(input_image):
    if isinstance(input_image, str):
        input_image = Image.open(input_image)
    return input_image

def normalize_images(input_image):
    # Convert images to numpy arrays
    input_image_np = np.array(input_image)

    # Normalize the image data to 0-1
    input_image_np = input_image_np.astype('float32') / 255.0

    # Convert numpy arrays back to PIL Images
    input_image = Image.fromarray((input_image_np * 255).astype(np.uint8))

    return input_image

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
        self.model = YOLO('yolov8n.pt', verbose=False)

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
        input_image = load_image(image_path)
        return self.process_image(input_image)

    def process_image(self, input_image):
        input_image = rcpf.rotate_image_based_on_exif(input_image)        
        input_image = self.is_aspect_ratio_match(input_image)
        input_image = normalize_images(input_image)
        
        if input_image.mode != 'RGB':
            input_image = input_image.convert('RGB')

        if input_image.size != (self.img_width, self.img_height):
            input_image = self.resize(input_image)

        # Convert the image into a tensor
        input_image = self.transforms(input_image)
        input_image = input_image.unsqueeze(0)  # Add batch dimension
        
        return input_image

    def process_face_image_Non_AI(self, input_image):
        input_image = rcpf.rotate_image_based_on_exif(input_image) 
        resized_img = FCL.resize_image(input_image, self.img_width, self.img_height)
        face_tensor = process_face_image(resized_img)
        face_tensor = face_tensor.unsqueeze(0)
        return face_tensor

    def process_face_image_Non_AI_2(self, input_image):
        input_image = rcpf.rotate_image_based_on_exif(input_image) 
        resized_img = FCL.resize_image(input_image, self.img_width, self.img_height)
        face_image = normalize_images(resized_img)
        face_tensor = self.transforms(face_image)
        face_tensor = face_tensor.unsqueeze(0)
        return face_tensor
    
    def process_face_image_Non_AI_3(self, input_image):
        input_image = rcpf.rotate_image_based_on_exif(input_image) 
        resized_img = FCL.resize_image(input_image, self.img_width, self.img_height)
        return resized_img


    def image_loader(self, source_folder):
        image_paths = natsorted(os.listdir(source_folder))
        processed_images = []

        for image_name in image_paths:
            try:
                if image_name.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')):
                    image_path = os.path.join(source_folder, image_name)
                    img = self.process_image_path(image_path)
                    processed_images.append((img, image_name))  # Append as a tuple (img, image_name)

            except Exception as e:
                print(f"Failed to process {image_name}: {e}")
                
        return processed_images

    def display_image(self, image_tensor):
        if len(image_tensor.shape) == 4:
            image_tensor = image_tensor.squeeze(0)
        # Convert the tensor back to a PIL image and display it
        image = T.ToPILImage()(image_tensor)
        plt.imshow(image)
        plt.axis('off')  # Hide axes
        plt.show()

def process_images_from_folder():
    source_folder = r'./source_images'
    destination_folder = r"./results"
    
    # Create destination folder if it doesn't exist
    if not os.path.exists(destination_folder):
        os.makedirs(destination_folder)

    processor = InferenceImageProcessor(img_width=2048, img_height=4096)
    image_paths = natsorted(os.listdir(source_folder))
    loop = tqdm(image_paths, leave=True)

    for image_name in loop:
        try:
            # Check if file is an image
            if image_name.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')):
                image_path = os.path.join(source_folder, image_name)
                img = Image.open(image_path)
                img = rcpf.rotate_image_based_on_exif(img)
                
                processed_image = processor.is_aspect_ratio_match(img)
                if processed_image is not None:
                    save_path = os.path.join(destination_folder, image_name)
                    processed_image.save(save_path)

        except Exception as e:
            print(f"Failed to process {image_name}: {e}")

if __name__ == "__main__":
    process_images_from_folder()
