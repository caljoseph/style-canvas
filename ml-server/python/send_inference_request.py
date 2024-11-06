import requests
from PIL import Image
import os
from io import BytesIO
from ImageSaver import ImageSaver


def send_image_to_docker(img_path: str) -> Image:
    url = "http://localhost:8000/infer"  # Endpoint of your FastAPI server

    # Open the image file in binary mode
    with open(img_path, "rb") as img_file:
        files = {"file": img_file}
        response = requests.post(url, files=files)

    if response.ok:
        print("Inference result received.")
        # Load the received image
        img = Image.open(BytesIO(response.content))
        return img
    else:
        print("Failed to get inference result.")
        response.raise_for_status()

# Client code
def run_test():
    destination_folder = r"./Results"
    source_folder = r'./Test_Images'
    image_saver = ImageSaver(destination_folder)

    # Ensure destination folder exists
    os.makedirs(destination_folder, exist_ok=True)

    # Iterate through each file in the source folder
    for filename in os.listdir(source_folder):
        if filename.endswith(('.jpeg', '.jpg', '.png')):  # Filter for common image formats
            source_image_path = os.path.join(source_folder, filename)
            print(f"Processing image: {filename}")

            # Send image to Docker and get the processed image
            processed_image = send_image_to_docker(source_image_path)

            # Save the processed image using save_image_2
            image_saver.save_image_2(filename, processed_image)
            print(f"Saved processed image: {filename}")

if __name__ == "__main__":
    run_test()

