import io
from fastapi import FastAPI, File, UploadFile
from starlette.responses import StreamingResponse, JSONResponse
from PIL import Image
import os
import logging
import numpy as np
import traceback
import Diff_I2I_lib as Diff
from DiffI2IModelEnum import DiffI2IModelEnum

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
model_enum = None


@app.on_event("startup")
def configuring_model_settings():
    global model_enum
    checkpoints_path = "./checkpoints"
    model_enum = get_model_from_checkpoints(checkpoints_path)


@app.post("/infer")
async def infer_image(file: UploadFile = File(...)):
    try:
        # Read the uploaded image file
        buffer = await file.read()
        img = Image.open(io.BytesIO(buffer)).convert("RGB")  # Open as RGB

        # Run inference on the image using FaceParsing_T2
        processed_image = run_diffi2i_model(img)

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
    
def get_model_from_checkpoints(checkpoints_path: str):
    """
    Check the checkpoints folder and return the enum corresponding to the model's configuration.
    
    Args:
        checkpoints_path (str): Path to the checkpoints directory.

    Returns:
        DiffI2IModelEnum: Enum value of the detected model.
    """
    # Ensure the path exists and is a directory
    if not os.path.isdir(checkpoints_path):
        raise ValueError(f"Path '{checkpoints_path}' is not a valid directory.")

    # List all folders in the checkpoints directory
    folders = [f for f in os.listdir(checkpoints_path) if os.path.isdir(os.path.join(checkpoints_path, f))]

    if len(folders) != 1:
        raise ValueError("Expected exactly one folder in the checkpoints directory. Found: " + ", ".join(folders))

    folder_name = folders[0]  # The single folder present in the checkpoints path

    # Map folder names to model enums based on the S2ModelConfigurations
    folder_to_model_enum = {
        "OilPainting_SC3": DiffI2IModelEnum.SC3,
        "OilPainting_3": DiffI2IModelEnum.OP3,
        "Face_Parsing_Test_2": DiffI2IModelEnum.FaceParsing_T2,
        "T1_Pencil_Face": DiffI2IModelEnum.Pencil_Blur,
        "T3_Verdant_Flame": DiffI2IModelEnum.T3_Verdant_Flame,
    }

    # Return the matching enum or Unknown if not found
    return folder_to_model_enum.get(folder_name, DiffI2IModelEnum.Unknown)

def run_diffi2i_model(img):
    """
    Calls the appropriate DiffI2I model function based on the current model_enum.

    Args:
        img (PIL.Image.Image): Input image.

    Returns:
        PIL.Image.Image or np.ndarray: Processed image.
    """
    global model_enum

    # Ensure model_enum is set
    if model_enum is None:
        raise ValueError("Model enum is not configured. Ensure 'configuring_model_settings' runs on startup.")

    # Map model_enum to corresponding function
    model_switch = {
        DiffI2IModelEnum.SC3: OilPainting_SC3,
        DiffI2IModelEnum.OP3: OilPainting_OP3,
        DiffI2IModelEnum.Pencil_Blur: pencil_blur,
        DiffI2IModelEnum.T3_Verdant_Flame: Verdant_Flame,
    }

    # Get the model function based on the current model_enum
    model_function = model_switch.get(model_enum)

    # If model_enum doesn't match any known model, raise an error
    if model_function is None:
        raise ValueError(f"Unsupported model enum: {model_enum}")

    # Call the appropriate model function with the image
    return model_function(img)

# All DiffI2I models:

def OilPainting_SC3(img):
    return  Diff.OilPainting_SC3(img)

def OilPainting_OP3(img):
    return  Diff.OilPainting_OP3(img)

def pencil_blur(img):
    return  Diff.pencil_blur(img)

def Verdant_Flame(img):
    return  Diff.Verdant_Flame(img)







