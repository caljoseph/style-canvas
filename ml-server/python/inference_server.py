import io
from fastapi import FastAPI, File, UploadFile
from starlette.responses import StreamingResponse, JSONResponse
import pickle
import torch
from PIL import Image
from torchvision import transforms as T
from DiffI2I_Inference import DiffI2IManager
from S2ModelConfigurations import S2ModelConfigurations
import logging
import time

# Set up logging with timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("inference_server")

app = FastAPI()

# Global variables
manager = None
is_model_loaded = False

def load_model_if_needed():
    global manager, is_model_loaded
    if not is_model_loaded:
        logger.info("Loading model...")
        manager = DiffI2IManager(S2ModelConfigurations.FaceParsing_T2_Parameters)
        is_model_loaded = True
        logger.info("Model loaded successfully")

@app.on_event("startup")
async def startup_event():
    load_model_if_needed()
    logger.info("Server startup complete")

@app.post("/infer")
async def infer_image(file: UploadFile = File(...)):
    try:
        start_time = time.time()
        logger.info(f"Received request with file size: {file.size} bytes")

        # Read the tensor from the uploaded file
        logger.info("Reading uploaded tensor...")
        buffer = await file.read()
        logger.info(f"Read complete. Buffer size: {len(buffer)} bytes")

        # Load tensor
        logger.info("Deserializing tensor...")
        input_tensor = torch.load(io.BytesIO(buffer))
        logger.info(f"Input tensor shape: {input_tensor.shape}")

        # Process with model
        logger.info("Starting model inference...")
        output_tensor = manager.run_Diffi2i_S2(input_tensor)
        logger.info(f"Inference complete. Output tensor shape: {output_tensor.shape}")

        # Serialize the output tensor
        logger.info("Serializing output tensor...")
        output_buffer = io.BytesIO()
        torch.save(output_tensor, output_buffer)
        output_buffer.seek(0)
        logger.info(f"Output buffer size: {len(output_buffer.getvalue())} bytes")

        end_time = time.time()
        logger.info(f"Total processing time: {end_time - start_time:.2f} seconds")

        return StreamingResponse(
            output_buffer,
            media_type="application/octet-stream"
        )

    except Exception as e:
        logger.error(f"Error during inference: {str(e)}", exc_info=True)
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )
