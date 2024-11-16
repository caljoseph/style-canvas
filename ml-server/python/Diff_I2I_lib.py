import reuseablecustompythonfunctions as rcpf
from FaceImageProcessor import FaceImageProcessor
from DiffI2I_Inference import DiffI2IManager
from S2ModelConfigurations import S2ModelConfigurations
from InferenceImageProcessor import InferenceImageProcessor
import io
import requests
from torchvision import transforms as T
import pickle
import torch
import torchvision.transforms as T


manager = None
is_OP3_loaded = False
is_SC3_loaded = False
is_Sketches_T5_loaded = False
is_FaceParsing_T1_loaded = False
is_FaceParsing_T2_loaded = False
is_pencil_blur_loaded = False
is_verdant_flame_loaded = False

def Generate_Face_image(img, parameters):
    global manager
    processor_images = InferenceImageProcessor(parameters.img_width, parameters.img_height)
    processed_image = processor_images.process_image(img)
    OilPainting = manager.run_Diffi2i_S2(processed_image)
    OilPainting = rcpf.tensor2im(OilPainting, normalize=False)
    return OilPainting

def Generate_Face_Parsing_image(img, parameters):
    global manager
    processor_images = InferenceImageProcessor(parameters.img_width, parameters.img_height)
    processed_image = processor_images.process_face_image_Non_AI_2(img)
    processed_image = manager.run_Diffi2i_S2(processed_image)
    return processed_image

def Generate_Full_Body_image(img, parameters):
    global manager
    processor_images = InferenceImageProcessor(parameters.img_width, parameters.img_height)
    processed_image = processor_images.process_image(img)
    processed_image = manager.run_Diffi2i_S2(processed_image)
    processed_image = rcpf.tensor2im(processed_image, normalize=False)
    return processed_image

def OilPainting_OP3(img):
   global is_OP3_loaded, is_SC3_loaded, manager

   if not is_OP3_loaded:
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.OP3_Parameters)
        is_OP3_loaded = True
        is_SC3_loaded = False
   
   return Generate_Face_image(img, S2ModelConfigurations.OP3_Parameters)

def OilPainting_SC3(img):
     global is_OP3_loaded, is_SC3_loaded, manager
     
     if not is_SC3_loaded:
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.SC3_Parameters)
        is_SC3_loaded = True
        is_OP3_loaded = False  
    
     return Generate_Face_image(img, S2ModelConfigurations.SC3_Parameters)

def Sketches_T5(img):
    global is_Sketches_T5_loaded, manager
    if not is_Sketches_T5_loaded:
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.T5_Sketches_Parameters)
    return Generate_Full_Body_image(img, S2ModelConfigurations.T5_Sketches_Parameters)

def pencil_blur(img):
    global is_pencil_blur_loaded, manager
    if not is_pencil_blur_loaded:
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.Pencil_Blur_Parameters)
        is_pencil_blur_loaded = True
    return Generate_Face_image(img, S2ModelConfigurations.Pencil_Blur_Parameters)

def FaceParsing_T1(img):
    global is_FaceParsing_T1_loaded, manager
    if not is_FaceParsing_T1_loaded:
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.FaceParsing_T1_Parameters)
        is_FaceParsing_T1_loaded = True
    return Generate_Face_Parsing_image(img, S2ModelConfigurations.FaceParsing_T1_Parameters)

def FaceParsing_T3(img):
    global is_FaceParsing_T2_loaded, manager
    if not is_FaceParsing_T2_loaded:
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.FaceParsing_T2_Parameters)
        is_FaceParsing_T2_loaded = True
    return Generate_Face_Parsing_image(img, S2ModelConfigurations.FaceParsing_T2_Parameters)



def FaceParsing_T2(img):
    """
    Preprocesses the image using FaceImageProcessor, sends it to the server for inference,
    and returns the result as a tensor.
    """
    print("Starting FaceParsing_T2 processing...")

    # Initialize and apply FaceImageProcessor to preprocess the image
    processor_images = FaceImageProcessor(512, 512)
    processed_image_tensor = processor_images.process_image(img)
    print(f"Processed image tensor shape: {processed_image_tensor.shape}")

    # Send the tensor to the inference server
    INFERENCE_API_URL = "http://localhost:8000/infer"
    buffer = io.BytesIO()
    torch.save(processed_image_tensor, buffer)
    buffer.seek(0)

    print(f"Sending tensor to server, buffer size: {len(buffer.getvalue())} bytes")

    try:
        # Send the preprocessed image tensor to the server
        response = requests.post(
            INFERENCE_API_URL,
            files={"file": ("image.pt", buffer, "application/octet-stream")},
            timeout=60
        )
        print(f"Server response status code: {response.status_code}")

        if response.status_code != 200:
            print(f"Server error response: {response.text}")
            return None

        # Load the tensor directly from response content
        result_tensor = torch.load(io.BytesIO(response.content))
        print(f"Received result tensor shape: {result_tensor.shape}")
        return result_tensor

    except requests.exceptions.RequestException as e:
        print(f"Network error during inference: {str(e)}")
        return None
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return None

def tensor_to_pil(tensor):
    mean = torch.tensor([0.5, 0.5, 0.5]).view(3, 1, 1)
    std = torch.tensor([0.5, 0.5, 0.5]).view(3, 1, 1)
    tensor = tensor.squeeze(0).cpu() * std + mean
    tensor = torch.clamp(tensor, 0, 1)
    return T.ToPILImage()(tensor)

def Verdant_Flame(img):
    global is_verdant_flame_loaded, manager
    if not is_verdant_flame_loaded:
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.T3_Verdant_Flame_Parameters)
        is_verdant_flame_loaded = True
    return Generate_Face_image(img, S2ModelConfigurations.T3_Verdant_Flame_Parameters)