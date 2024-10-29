import cv2
import numpy as np
from skimage.util import random_noise

def add_film_grain(image_path, output_path, grain_amount=0.02):
    """
    Adds a film grain effect to an image.
    
    Parameters:
    - image_path: str, path to the input image
    - output_path: str, path to save the output image
    - grain_amount: float, amount of grain to add (default is 0.02)
    """
    # Read the image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Image not found at the specified path")

    # Convert image to float32 for processing
    image = image.astype(np.float32) / 255.0

    # Add random noise to the image
    noisy_image = random_noise(image, mode='s&p', amount=grain_amount)
    
    # Convert back to 8-bit image
    noisy_image = (noisy_image * 255).astype(np.uint8)
    
    # Save the output image
    cv2.imwrite(output_path, noisy_image)

# Example usage
add_film_grain("C:\Oilpainting\train_B\Red_F256_Face_Parsing_134\1522.png", 'C:\Oilpainting\train_B\output_image.png', grain_amount=0.02)
