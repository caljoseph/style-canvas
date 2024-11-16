import style_canvas_utils as scu
from FaceImageProcessor import FaceImageProcessor
from InferenceImageProcessor import InferenceImageProcessor
from DiffI2I_Inference import DiffI2IManager
from S2ModelConfigurations import S2ModelConfigurations

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
    processor_images = FaceImageProcessor(parameters.img_width, parameters.img_height)
    processed_image = processor_images.process_image(img)
    OilPainting = manager.run_Diffi2i_S2(processed_image)
    OilPainting = scu.tensor2im(OilPainting, normalize=False)
    return OilPainting

def Generate_Face_Parsing_image(img, parameters):
    global manager
    processor_images = FaceImageProcessor(parameters.img_width, parameters.img_height)
    processed_image = processor_images.process_image(img)
    processed_image = manager.run_Diffi2i_S2(processed_image)
    return processed_image

def Generate_Full_Body_image(img, parameters):
    global manager
    processor_images = InferenceImageProcessor(parameters.img_width, parameters.img_height)
    processed_image = processor_images.process_image(img)
    processed_image = manager.run_Diffi2i_S2(processed_image)
    processed_image = scu.tensor2im(processed_image, normalize=False)
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

def FaceParsing_T2(img):
    global is_FaceParsing_T2_loaded, manager
    if not is_FaceParsing_T2_loaded:
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.FaceParsing_T2_Parameters)
        is_FaceParsing_T2_loaded = True
    return Generate_Face_Parsing_image(img, S2ModelConfigurations.FaceParsing_T2_Parameters)

def Verdant_Flame(img):
    global is_verdant_flame_loaded, manager
    if not is_verdant_flame_loaded:
        manager = None
        manager = DiffI2IManager(S2ModelConfigurations.T3_Verdant_Flame_Parameters)
        is_verdant_flame_loaded = True
    return Generate_Face_image(img, S2ModelConfigurations.T3_Verdant_Flame_Parameters)