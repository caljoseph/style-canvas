import io
from fastapi import FastAPI, File, UploadFile
from starlette.responses import StreamingResponse, JSONResponse
import pickle
import torch
from PIL import Image
from torchvision import transforms as T
from DiffI2I_Inference import DiffI2IManager
from S2ModelConfigurations import S2ModelConfigurations
import os
from ImageSaver import ImageSaver
import logging
import asyncio
import numpy as np
import traceback
import style_canvas_utils as scu

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('server.log')
    ]
)
logger = logging.getLogger("inference_server")

app = FastAPI()

# Model setup
manager = None
is_FaceParsing_T2_loaded = False
DEBUG_IMAGE_DIR = "/app/Server_Debug_Images"  # Directory to save debug images

# Ensure debug directory exists
os.makedirs(DEBUG_IMAGE_DIR, exist_ok=True)


def save_debug_image(tensor, filename):
    """Convert a tensor to a PIL image and save it for debugging."""
    logger.info("Attempting to save debug image.")
    try:
        # De-normalize the tensor
        mean = torch.tensor([0.5, 0.5, 0.5]).view(3, 1, 1)
        std = torch.tensor([0.5, 0.5, 0.5]).view(3, 1, 1)
        tensor = tensor.squeeze(0).cpu() * std + mean  # De-normalize
        tensor = torch.clamp(tensor, 0, 1)  # Clamp to valid range

        # Convert to PIL and save
        img = T.ToPILImage()(tensor)
        img_path = os.path.join(DEBUG_IMAGE_DIR, filename)
        img.save(img_path)
        logger.info(f"Image saved at: {img_path}")
    except Exception as e:
        logger.error(f"Failed to save debug image {filename}: {e}")

@app.on_event("startup")
def load_model():
    global is_FaceParsing_T2_loaded, manager
    logger.info(f"Attempting to load model... is_FaceParsing_T2_loaded: {is_FaceParsing_T2_loaded}")

    if not is_FaceParsing_T2_loaded:
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.FaceParsing_T2_Parameters)
        is_FaceParsing_T2_loaded = True


@app.post("/infer")
async def infer_image(file: UploadFile = File(...)):
    try:
        # Read the uploaded image file
        buffer = await file.read()
        img = Image.open(io.BytesIO(buffer)).convert("RGB")  # Open as RGB

        # Run inference on the image using FaceParsing_T2
        processed_image = FaceParsing_T2(img)

        # Convert numpy array to PIL Image if needed
        if isinstance(processed_image, np.ndarray):
            processed_image = Image.fromarray(processed_image)

        # Save the processed image to a buffer to send as response
        buf = io.BytesIO()
        processed_image.save(buf, format="JPEG")
        buf.seek(0)

        return StreamingResponse(buf, media_type="image/jpeg")

    except Exception as e:
        # Log the full traceback for debugging
        error_message = f"Error during inference: {str(e)}\n{traceback.format_exc()}"
        print(error_message)
        return JSONResponse(content={"error": error_message}, status_code=500)
    


def normalize_images(input_image):
    # Convert images to numpy arrays
    input_image_np = np.array(input_image)

    # Normalize the image data to 0-1
    input_image_np = input_image_np.astype('float32') / 255.0

    # Convert numpy arrays back to PIL Images
    input_image = Image.fromarray((input_image_np * 255).astype(np.uint8))

    return input_image

class ImageProcessor:
    def __init__(self):
        # Set up transformations to convert to a tensor
        self.transforms = T.ToTensor()

    def process_face_image_Non_AI_2(self, input_image):
        # Normalize the image
        face_image = normalize_images(input_image)
        
        # Convert normalized image to tensor
        face_tensor = self.transforms(face_image)  # Now face_tensor is a torch.Tensor
        
        # Add a batch dimension
        face_tensor = face_tensor.unsqueeze(0)
        
        return face_tensor


def Generate_Face_Parsing_image(img):
    global manager
    pi =  ImageProcessor()
    processed_image = pi.process_face_image_Non_AI_2(img)
    processed_image = manager.run_Diffi2i_S2(processed_image)
    return processed_image

def FaceParsing_T3(img):
    global is_FaceParsing_T2_loaded, manager
    if not is_FaceParsing_T2_loaded:
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.FaceParsing_T2_Parameters)
        is_FaceParsing_T2_loaded = True
    return Generate_Face_Parsing_image(img)



def FaceParsing_T2(img):
    face_parsing = FaceParsing_T3(img)
    return  scu.tensor2im(face_parsing, normalize=False)


def Run_Test():
    print("CUDA is ", torch.cuda.is_available())
    destination_folder = r"./Results"
    source_folder = r'./Test_Images'
    image_saver = ImageSaver(destination_folder)

    # Ensure destination folder exists
    os.makedirs(destination_folder, exist_ok=True)

    # Iterate through each file in the source folder
    for filename in os.listdir(source_folder):
        if filename.endswith(('.jpeg', '.jpg', '.png')):  # Filter for common image formats
            source_image_path = os.path.join(source_folder, filename)
            img = Image.open(source_image_path)
            print(f"Processing image: {filename}")

            # Process the image
            processed_image = FaceParsing_T2(img)

            # Save the processed image with the same filename
            image_saver.save_image(filename, processed_image)
            print(f"Saved processed image: {filename}")






