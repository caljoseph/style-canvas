from Pix2Pix import Generator
import Pix2Pix as p2p
import FaceDetectorLib as scu
import torch
from InferenceImageProcessor import InferenceImageProcessor
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

img_height= 1024
img_width= 1024

is_facetopaint_model_loaded = False
Face2Paint_Gen_Path = r"./checkpoints/FacePainting/Gen_Original_Face2Paint_Models_2.pth.tar"
face_2_paint_model = None

def GetFace2PaintModel():
    global is_facetopaint_model_loaded
    print("Initializing Face2Paint model")
    face2paint_gen_model, _ = p2p.create_and_load_model(Face2Paint_Gen_Path, Generator)
    is_facetopaint_model_loaded = True
    return face2paint_gen_model

def Generate_Face2Paint_image(img):
    global face_2_paint_model
    if not is_facetopaint_model_loaded:
        face_2_paint_model = GetFace2PaintModel()

    processor_images = InferenceImageProcessor(img_height, img_width)
    processed_image = processor_images.process_image(img)
    processed_image = processed_image.to(DEVICE)
    with torch.no_grad():   
        face_painting = face_2_paint_model(processed_image)
    face_painting = scu.tensor2im(face_painting, normalize=False)
    return face_painting