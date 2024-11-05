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
import reuseablecustompythonfunctions as rcpf

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


def load_model():
    global is_FaceParsing_T2_loaded, manager
    logger.info(f"Attempting to load model... is_FaceParsing_T2_loaded: {is_FaceParsing_T2_loaded}")

    if not is_FaceParsing_T2_loaded:
        try:
            # Initialize the model manager
            manager = DiffI2IManager(S2ModelConfigurations.FaceParsing_T2_Parameters)
            is_FaceParsing_T2_loaded = True

            if manager.Diffi2i_S2 is not None:
                logger.info("Model loaded into manager.Diffi2i_S2")
                logger.info(f"Model device: {manager.device}")
                logger.info(f"Loaded model parameters: {[param.shape for param in manager.Diffi2i_S2.parameters()]}")
            else:
                logger.error("Model was not loaded correctly; manager.Diffi2i_S2 is None.")
            logger.info("FaceParsing_T2 model loaded successfully.")
        except Exception as e:
            logger.error(f"Error loading FaceParsing_T2 model: {e}")
    
    asyncio.run(Run_Test())

@app.post("/infer")
async def infer_image(file: UploadFile = File(...)):
    logger.info("=== Starting new inference request ===")
    try:
        # Load tensor from the uploaded file
        logger.info("Reading uploaded file...")
        buffer = await file.read()
        logger.info(f"File size: {len(buffer)} bytes")

        logger.info("Loading tensor from buffer...")
        input_tensor = torch.load(io.BytesIO(buffer))
        logger.info(f"Input tensor shape: {input_tensor.shape}")

        # Save received input tensor as an image for debugging
        logger.info("Saving debug input image...")
        save_debug_image(input_tensor, "received_input.png")

        # Run inference
        logger.info("Starting inference...")
        result_tensor = manager.run_Diffi2i_S2(input_tensor)
        logger.info(f"Inference completed. Output tensor shape: {result_tensor.shape}")

        # Save output tensor as an image for debugging
        logger.info("Saving debug output image...")
        save_debug_image(result_tensor, "output_result.png")

        # Serialize result tensor for response
        logger.info("Serializing result tensor...")
        tensor_bytes = pickle.dumps(result_tensor.cpu())
        logger.info("Sending response...")
        return StreamingResponse(io.BytesIO(tensor_bytes), media_type="application/octet-stream")

    except Exception as e:
        logger.error(f"Error during inference: {e}", exc_info=True)
        return JSONResponse(content={"error": str(e)}, status_code=500)


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
        print("Inside of process_face_image_Non_AI_2")
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
    return  rcpf.tensor2im(face_parsing, normalize=False)

@app.on_event("startup")
def Run_Test():
    destination_folder = r"./Results"
    source_image = r'./Test_Images/IMG_7369.JPG'
    image_saver = ImageSaver(destination_folder) 
    img = Image.open(source_image)
    print(" Image loaded ")
    processed_image = FaceParsing_T2(img)
    image_saver.save_image("IMG_7369.JPG", processed_image)




