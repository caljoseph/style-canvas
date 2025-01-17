import style_canvas_utils as scu
from FaceImageProcessor import FaceImageProcessor
from InferenceImageProcessor import InferenceImageProcessor
from DiffI2I_Inference import DiffI2IManager
from S2ModelConfigurations import S2ModelConfigurations
import torch

manager = None
is_OP3_loaded = False
is_SC3_loaded = False
is_Sketches_T5_loaded = False
is_FaceParsing_T1_loaded = False
is_FaceParsing_T2_loaded = False
is_pencil_blur_loaded = False
is_verdant_flame_loaded = False
is_ComicCrafterAI_loaded = False
is_ComicCrafterAI_T1_loaded = False
is_BlockFilter_loaded = False


def generate_stylized_face_image(img, parameters):
    global manager
    processor_images = FaceImageProcessor(parameters.img_width, parameters.img_height)
    processed_image = processor_images.prepare_face_tensor_imagenet(img)
    OilPainting = manager.run_Diffi2i_S2(processed_image)
    OilPainting = scu.tensor2im(OilPainting, normalize=False)
    return OilPainting


def Generate_Face_image(img, parameters):
    global manager
    processor_images = FaceImageProcessor(parameters.img_width, parameters.img_height)
    processed_image = processor_images.process_image_for_diffI2I_models(img)
    OilPainting = manager.run_Diffi2i_S2(processed_image)
    OilPainting = scu.tensor2im(OilPainting, normalize=False)
    return OilPainting

def Generate_Face_Parsing_image(img, parameters):
    global manager
    processor_images = FaceImageProcessor(parameters.img_width, parameters.img_height)
    cropped_image = processor_images.process_image_for_diffI2I_models(img)
    segmented_image = manager.run_Diffi2i_S2(cropped_image)

    if isinstance(cropped_image, torch.Tensor):
        if cropped_image.dim() == 4 and cropped_image.shape[0] == 1:
            cropped_image = cropped_image.squeeze(0)
        cropped_image = cropped_image.cpu().permute(1, 2, 0).numpy()

    return segmented_image, cropped_image

def Generate_Full_Body_image(img, parameters):
    global manager
    processor_images = InferenceImageProcessor(parameters.img_width, parameters.img_height)
    processed_image = processor_images.process_image(img)
    processed_image = manager.run_Diffi2i_S2(processed_image)
    processed_image = scu.tensor2im(processed_image, normalize=False)
    return processed_image

def reset_flags_and_set_active(active_flag):
    """
    Sets all load flags to False except the specified active_flag, which will be set to True.
    """
    global is_OP3_loaded, is_SC3_loaded, is_Sketches_T5_loaded, is_FaceParsing_T1_loaded
    global is_FaceParsing_T2_loaded, is_pencil_blur_loaded, is_verdant_flame_loaded
    global is_ComicCrafterAI_loaded, is_ComicCrafterAI_T1_loaded , is_BlockFilter_loaded

    # Reset all flags to False
    is_OP3_loaded = False
    is_SC3_loaded = False
    is_Sketches_T5_loaded = False
    is_FaceParsing_T1_loaded = False
    is_FaceParsing_T2_loaded = False
    is_pencil_blur_loaded = False
    is_verdant_flame_loaded = False
    is_ComicCrafterAI_loaded = False
    is_ComicCrafterAI_T1_loaded = False
    is_BlockFilter_loaded = False

    # Set the specified flag to True
    if active_flag == "is_OP3_loaded":
        is_OP3_loaded = True
    elif active_flag == "is_SC3_loaded":
        is_SC3_loaded = True
    elif active_flag == "is_Sketches_T5_loaded":
        is_Sketches_T5_loaded = True
    elif active_flag == "is_FaceParsing_T1_loaded":
        is_FaceParsing_T1_loaded = True
    elif active_flag == "is_FaceParsing_T2_loaded":
        is_FaceParsing_T2_loaded = True
    elif active_flag == "is_pencil_blur_loaded":
        is_pencil_blur_loaded = True
    elif active_flag == "is_verdant_flame_loaded":
        is_verdant_flame_loaded = True
    elif active_flag == "is_ComicCrafterAI_loaded":
        is_ComicCrafterAI_loaded = True
    elif active_flag == "is_ComicCrafterAI_T1_loaded":
        is_ComicCrafterAI_T1_loaded = True
    elif active_flag == "is_BlockFilter_loaded":
        is_BlockFilter_loaded = True

def BlockFilter(img):
    global manager, is_BlockFilter_loaded

    if not is_BlockFilter_loaded:
        reset_flags_and_set_active("is_BlockFilter_loaded")
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.BlockFilter_Parameters)
    
    return generate_stylized_face_image(img, S2ModelConfigurations.BlockFilter_Parameters)

def ComicCrafterAI(img):
    global manager, is_ComicCrafterAI_loaded

    if not is_ComicCrafterAI_loaded:
        reset_flags_and_set_active("is_ComicCrafterAI_loaded")
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.Comic_CrafterAI_Parameters)
    
    return generate_stylized_face_image(img, S2ModelConfigurations.Comic_CrafterAI_Parameters)

def ComicCrafterAI_T1(img):
    global manager, is_ComicCrafterAI_T1_loaded
    print(" inside of is_ComicCrafterAI_T1_loaded")
    if not is_ComicCrafterAI_T1_loaded:
        reset_flags_and_set_active("is_ComicCrafterAI_T1_loaded")
        print(" inside of  if not is_ComicCrafterAI_T1_loaded ")
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.Comic_CrafterAI_Parameters_T1)
    
    return generate_stylized_face_image(img, S2ModelConfigurations.Comic_CrafterAI_Parameters_T1)

def OilPainting_OP3(img):
   global is_OP3_loaded, is_SC3_loaded, manager

   if not is_OP3_loaded:
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.OP3_Parameters)
        is_OP3_loaded = True
        is_SC3_loaded = False
   
   return Generate_Face_image(img, S2ModelConfigurations.OP3_Parameters)

def OilPainting_OP3(img):
    global manager

    if not is_OP3_loaded:
        reset_flags_and_set_active("is_OP3_loaded")
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.OP3_Parameters)
    
    return Generate_Face_image(img, S2ModelConfigurations.OP3_Parameters)

def Sketches_T5(img):
    global manager
    if not is_Sketches_T5_loaded:
        reset_flags_and_set_active("is_Sketches_T5_loaded")
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.T5_Sketches_Parameters)
    return Generate_Full_Body_image(img, S2ModelConfigurations.T5_Sketches_Parameters)

def pencil_blur(img):
    global manager
    if not is_pencil_blur_loaded:
        reset_flags_and_set_active("is_pencil_blur_loaded")
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.Pencil_Blur_Parameters)
    return Generate_Face_image(img, S2ModelConfigurations.Pencil_Blur_Parameters)

def FaceParsing_T1(img):
    global manager
    if not is_FaceParsing_T1_loaded:
        reset_flags_and_set_active("is_FaceParsing_T1_loaded")
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.FaceParsing_T1_Parameters)
    return Generate_Face_Parsing_image(img, S2ModelConfigurations.FaceParsing_T1_Parameters)

def FaceParsing_T2(img):
    global manager
    if not is_FaceParsing_T2_loaded:
        reset_flags_and_set_active("is_FaceParsing_T2_loaded")
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.FaceParsing_T2_Parameters)
    return Generate_Face_Parsing_image(img, S2ModelConfigurations.FaceParsing_T2_Parameters)

def HopeArt(img):
    global manager
    if not is_verdant_flame_loaded:
        reset_flags_and_set_active("is_verdant_flame_loaded")
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.HopeArt)
    return generate_stylized_face_image(img, S2ModelConfigurations.HopeArt)
