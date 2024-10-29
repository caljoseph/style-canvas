import os
from PIL import Image
import cv2   
from torchvision.utils import save_image

class ImageSaver:
        def __init__(self, destination_folder):
                self.destination_folder = destination_folder
                self.img_dir = self.destination_folder
                os.makedirs(self.img_dir, exist_ok=True)

        def save_drawing(self, generated_image_filename, generated_image):
                # Convert generated image from BGR to RGB for saving
                generated_image_rgb = cv2.cvtColor(generated_image, cv2.COLOR_BGR2RGB)
                # Prepare filename: Replace .jpg, .JPG, and .jpeg regardless of case
                filename_lower = generated_image_filename.lower()
                if filename_lower.endswith(('.jpg', '.jpeg')):
                        generated_image_filename = generated_image_filename.rsplit('.', 1)[0] + '.png'
                generated_path = os.path.join(self.img_dir, generated_image_filename)
                Image.fromarray(generated_image_rgb).save(generated_path)

        def save_image(self, generated_image_filename, generated_image):
                filename_lower = generated_image_filename.lower()
                if filename_lower.endswith(('.jpg', '.jpeg')):
                        generated_image_filename = generated_image_filename.rsplit('.', 1)[0] + '.png'
                generated_path = os.path.join(self.img_dir, generated_image_filename)
                Image.fromarray(generated_image).save(generated_path)

        def save_image_2(self, generated_image_filename, generated_image):
                # Ensure the filename uses .png if it's originally .jpg or .jpeg
                filename_lower = generated_image_filename.lower()
                if filename_lower.endswith(('.jpg', '.jpeg')):
                        generated_image_filename = generated_image_filename.rsplit('.', 1)[0] + '.png'
                
                # Generate the path for saving the image
                generated_path = os.path.join(self.img_dir, generated_image_filename)

                # Check if the image is a PIL Image, and save directly
                if isinstance(generated_image, Image.Image):
                        generated_image.save(generated_path)
                else:
                        raise ValueError("Expected a PIL.Image object for saving.")


        def save_tensor(self, image_name, image):
                image_path = os.path.join(self.destination_folder, image_name)
                save_image(image, image_path)

           