# server.py

import io
from fastapi import FastAPI, File, UploadFile
from starlette.responses import StreamingResponse
from PIL import Image
import torch
import Face_Parsing_Model as fpm
import Diff_I2I_lib as Diff

app = FastAPI()

# Ensure the default face model is used
fpm.use_default_face_model = True

@app.post("/process-image")
async def process_image(file: UploadFile = File(...)):
    try:
        # Read image data
        image_data = await file.read()
        img = Image.open(io.BytesIO(image_data)).convert("RGB")

        # Process image using fpm.Generate_Face_Drawing
        face_drawing_styles = fpm.FaceDrawingTypes.TriadShade  # Adjust as needed
        processed_image = fpm.Generate_Face_Drawing(img, face_drawing_styles)

        # Convert processed image to bytes
        output_buffer = io.BytesIO()
        processed_image.save(output_buffer, format='PNG')
        output_buffer.seek(0)

        return StreamingResponse(output_buffer, media_type="image/png")
    except Exception as e:
        return {"error": str(e)}
