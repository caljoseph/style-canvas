from PIL import Image
from ultralytics import YOLO
import numpy as np
from basicsr.archs.rrdbnet_arch import RRDBNet
from realesrgan import RealESRGANer
import math
import style_canvas_utils as scu
import torch

minimum_required_image_height = 1024  
minimum_required_image_width = 1024

def upsampler_image(img, scale=2):
    torch.cuda.empty_cache()  # Clear any unused GPU memory before upsampling

    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
    upsampler = RealESRGANer(
        scale=scale,
        model_path=r'./Resize_Model_Weights/RealESRGAN_x4plus.pth',
        model=model,
        device=scu.DEVICE,
        gpu_id=scu.gpu_id,
    )

    img_np = np.array(img)  
    output_img, _ = upsampler.enhance(img_np)  
    
    return Image.fromarray(output_img)

class FaceImageProcessor:
    def __init__(self, img_width=4096, img_height=4096):
        self.img_width = img_width
        self.img_height = img_height
        self.model = YOLO('./Resize_Model_Weights/yolov8l-face.pt', verbose=False)

    def calculate_image_dimensions(self, img_width, img_height):
        # Calculate how many times we need to divide both dimensions by 2
        divisions_width = math.ceil(math.log2(self.img_width / img_width)) if self.img_width > img_width else 0
        divisions_height = math.ceil(math.log2(self.img_height / img_height)) if self.img_height > img_height else 0

        # Use the maximum number of divisions to ensure both width and height fit
        divisions = max(divisions_width, divisions_height)

        # Divide both default_width and default_height by 2^divisions
        new_width = self.img_width // (2 ** divisions)
        new_height = self.img_height // (2 ** divisions)
        return new_width, new_height

    def crop_and_resize_image(self, img):
        img_width, img_height = img.size
        if img_width < minimum_required_image_width or img_height < minimum_required_image_height:
            img = upsampler_image(img)

        img_width, img_height = img.size
        results = self.model(img)
        
        processed_faces = []  # To store each processed face image
        for box_data in results[0].boxes:  # Loop over all detected faces
            box = box_data.xyxy[0].cpu().numpy()  # Left, Top, Right, Bottom
            left, top, right, bottom = map(int, box)

            # Extend bounding box for hair, neck, shoulders
            vertical_extension_factor = 0.5
            horizontal_extension_factor = 0.2
            box_width = right - left
            box_height = bottom - top

            left_offset = max(0, left - int(box_width * horizontal_extension_factor))
            right_offset = min(img_width, right + int(box_width * horizontal_extension_factor))
            top_offset = max(0, top - int(box_height * vertical_extension_factor))
            bottom_offset = min(img_height, bottom + int(box_height * vertical_extension_factor))

            # Adjust bounding box
            adjusted_left_offset, adjusted_right_offset = self.adjust_bounding_box_aspect_ratio(
                left_offset, right_offset, top_offset, bottom_offset, img_width, img_height)

            # Crop the object from the image
            cropped_img = img.crop((adjusted_left_offset, top_offset, adjusted_right_offset, bottom_offset))

            # Resize the cropped image while keeping the aspect ratio intact
            cropped_width, cropped_height = cropped_img.size
            new_width, new_height = self.resize_object_to_fit(cropped_width, cropped_height, self.img_width, self.img_height)

            # Place the resized image on a white canvas
            processed_face = self.place_on_white_canvas(cropped_img.resize((new_width, new_height), Image.LANCZOS))
            processed_faces.append(processed_face)  # Add processed face to list

        # Return all processed faces or save them individually
        if not processed_faces:
            print("No object detected.")
            return None
        
        return processed_faces

    def resize_to_fill_target(self, img, target_width, target_height):
            """Resize the cropped image to fill the target dimensions without leaving any white space."""
            resized_img = img.resize((target_width, target_height), Image.LANCZOS)
            return resized_img.convert('RGB')
    
    def resize_object_to_fit(self, obj_width, obj_height, target_width, target_height):
        """
        Calculate new size of the object to fit into the target size while maintaining aspect ratio.
        """
        target_ratio = target_width / target_height
        object_ratio = obj_width / obj_height

        if object_ratio > target_ratio:
            # Object is wider than target, limit by width
            new_width = target_width
            new_height = int(new_width / object_ratio)
        else:
            # Object is taller than target, limit by height
            new_height = target_height
            new_width = int(new_height * object_ratio)
        
        return new_width, new_height
    
    def place_on_white_canvas(self, img):
        """Place the image on a white canvas of the target size (self.img_width x self.img_height)."""
        print("Placing image on white canvas")
        canvas = Image.new("RGB", (self.img_width, self.img_height), (255, 255, 255))  # White canvas
        img_width, img_height = img.size
        x_offset = (self.img_width - img_width) // 2
        y_offset = (self.img_height - img_height) // 2
        canvas.paste(img, (x_offset, y_offset))
        return canvas

    def adjust_bounding_box_aspect_ratio(self, left, right, top, bottom, img_width, img_height):
            """Adjust bounding box to maintain aspect ratio."""
            box_width = right - left
            box_height = bottom - top
            box_aspect_ratio = box_width / box_height
            target_aspect_ratio = self.img_width / self.img_height

            if box_aspect_ratio < target_aspect_ratio:
                extra_width = int((box_height * target_aspect_ratio) - box_width)
                left = max(0, left - extra_width // 2)
                right = min(img_width, right + extra_width // 2)
            return left, right

    def process_image(self, input_image):
            input_image = scu.rotate_image_based_on_exif(input_image)
            input_image = self.crop_and_resize_image(input_image)

            if input_image.mode != 'RGB':
                input_image = input_image.convert('RGB')

            input_image = rcpf.normalize_images(input_image)

            return input_image