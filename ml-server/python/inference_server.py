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
import logging

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