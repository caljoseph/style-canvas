import argparse
import sys
import os
import Face_Parsing_Model as fpm
import AdobeFilterModelLib as afm
import ChalkboardFilterLib as cbf
import Face2Paint as f2p
import Diff_I2I_lib as Diff
from Face_Parsing_Model import FaceDrawingTypes
import style_canvas_utils as scu
from ImageSaver import ImageSaver
import numpy as np
import argparse
import FaceImageProcessor as im
from FaceImageProcessor import FaceImageProcessor
from PIL import Image, ImageChops

fpm.use_default_face_model = True

# All Flat Art Models:

def ShadowSplit_Abstract(img):
    face_drawing_styles = FaceDrawingTypes.abstract_RedHaired
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles, False, True)
    return drawing

def ShadowSplit(img):
    face_drawing_styles = FaceDrawingTypes.Faceless_1
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles, Faceless= True)
    return drawing

def Kai_Face(img):
    face_drawing_styles = FaceDrawingTypes.Supreme_Kai_Faces
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles)
    return drawing

def TriadShade(img):
    face_drawing_styles = FaceDrawingTypes.TriadShade
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles)
    return drawing

def HarmonyHue(img):
    face_drawing_styles = FaceDrawingTypes.TriadicGlow
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles)
    return drawing

def TriadicVision(img):
    face_drawing_styles = FaceDrawingTypes.TriadicVision
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles)
    return drawing

def BlueShadeFace(img):
    face_drawing_styles = FaceDrawingTypes.BlueShade
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles )
    return drawing

def CrimsonCanvas(img):
    face_drawing_styles = FaceDrawingTypes.CrimsonCanvas
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles, False, True)
    return drawing

def DarkColorBlend(img):
    face_drawing_styles = FaceDrawingTypes.DarkColorBlend
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles, False, True)
    return drawing

def DotLineFace(img):
    face_drawing_styles = FaceDrawingTypes.Line_Work
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles, False, False, True)
    return drawing

def CrimsonContour(img):
    face_drawing_styles = FaceDrawingTypes.CrimsonCanvas
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles, True)
    return drawing

def Tenshi(img):
    face_drawing_styles = FaceDrawingTypes.Tenshi
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles, False, True)
    return drawing

def TenshiAbstract(img):
    face_drawing_styles = FaceDrawingTypes.TenshiAbstract
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles)
    return drawing

def ScarletFrame(img):
    face_drawing_styles = FaceDrawingTypes.ScarletFrame
    drawing = fpm.Generate_Face_Drawing(img, face_drawing_styles)
    return drawing

def RedMist(img):
    ai_model_name = 'HellFire'
    which_epoch= 16
    ngf = 128
    red_mist = afm.apply_filter_to_image(img, ai_model_name, which_epoch, ngf)
    return red_mist

# All Pix2Pix HD models:

def Impasto_L1(img):
    ai_model_name = 'Impasto_l1'
    which_epoch= 26
    ngf = 64
    n_local_enhancers = 1
    Impasto = afm.apply_filter_to_image(img, ai_model_name, which_epoch, ngf, n_local_enhancers)
    return Impasto

def Impasto(img):
    ai_model_name = 'Impasto'
    which_epoch= 22
    ngf = 64
    Impasto = afm.apply_filter_to_image(img, ai_model_name, which_epoch, ngf)
    return Impasto

def VanGogh(img):
    ai_model_name = 'VanGogh_OB'
    van_gogh = afm.apply_filter_to_image(img, ai_model_name)
    return van_gogh

def BlueMist(img):
    red_mist = RedMist(img)
    blue_mist  =  scu.TurnBlue(red_mist)
    return blue_mist

def Chalkboard(img):
    chalk_board = cbf.apply_chalkboard_Filter(img)
    return chalk_board

# All DiffI2I models:
def ComicCrafterAI(img):
    return Diff.ComicCrafterAI(img)

def ComicCrafterAI_T1(img):
    return Diff.ComicCrafterAI_T1(img)

def BlockFilter(img):
    return Diff.BlockFilter(img)

def BaroqueBrush(img):
    return  Diff.OilPainting_SC3(img)

def Baroquebrush_2(img):
    return  Diff.OilPainting_OP3(img)

def pencil_blur(img):
    return  Diff.pencil_blur(img)

def HopeArt(img):
    return  Diff.HopeArt(img)

def ColorOilPaint(img):
    return Diff.ColorOilPaint(img)

# Pix2Pix model:

def face2paint(img):
    return f2p.Generate_Face2Paint_image(img)

# Uses YOLO from ultralytics:

def crop_and_resize_face_image(img , img_width=4096, img_height=4096):
    processor_images = FaceImageProcessor(img_width, img_height)
    processed_image = processor_images.rotate_and_resize_image(img)
    final_image_np = np.array(processed_image)
    return final_image_np

def apply_broken_glass_effect(img):
    top_layer_path = r"./Broken_Glass_Assets/Broken_Glass_2.jpg"
    mask_path = r"./Broken_Glass_Assets/Broken_Glass_Mask_1.png"
    background_path = r"./Broken_Glass_Assets/background.png"  # Update with correct extension

    processor_images = FaceImageProcessor(4096, 4096)
    img = processor_images.rotate_and_resize_image(img)

    # Open and resize the mask to match the dimensions of the given image
    mask = Image.open(mask_path).convert("L")  # Convert to grayscale (L) for mask
    mask = mask.resize(img.size)

    # Add the mask as an alpha channel to the given image
    img_with_alpha = img.copy().convert("RGBA")  # Ensure the image has an alpha channel
    img_with_alpha.putalpha(mask)

    # Open the background image and resize it to the size of the given image
    background_layer = Image.open(background_path).convert("RGBA")
    background_layer = background_layer.resize(img.size)

    # Create a black canvas with the same size as the given image
    black_canvas = Image.new("RGBA", img.size, (0, 0, 0, 255))

    # Open the top layer image (Broken_Glass_2.jpg)
    top_layer = Image.open(top_layer_path).convert("RGBA")
    top_layer = top_layer.resize(img.size)

    # Blend the top layer using Multiply blend mode with the black canvas
    multiplied_top_layer = ImageChops.multiply(top_layer, black_canvas)

    # Composite the multiplied top layer over the background image
    final_image = Image.alpha_composite(background_layer, multiplied_top_layer)

    # Paste the given image with the broken glass mask over the final image
    final_image.paste(img_with_alpha, (0, 0), img_with_alpha)

    # Convert the final image to a NumPy array (if needed for saving)
    final_image_np = np.array(final_image)

    return final_image_np

# RealESRGANer model

def Upsample(img, scale = 2):
    return im.enhance_image_resolution(img, scale)

# Map filter names to functions
filter_functions = {
    'ComicCrafterAI' : ComicCrafterAI,
    'ComicCrafterAI_T1' : ComicCrafterAI_T1,
    'BlockFilter' : BlockFilter,
    'ShadowSplit_Abstract': ShadowSplit_Abstract,
    'ShadowSplit': ShadowSplit,
    'Kai_Face': Kai_Face,
    'TriadShade': TriadShade,
    'HarmonyHue': HarmonyHue,
    'TriadicVision': TriadicVision,
    'BlueShadeFace': BlueShadeFace,
    'CrimsonCanvas': CrimsonCanvas,
    'DarkColorBlend': DarkColorBlend,
    'DotLineFace': DotLineFace,
    'CrimsonContour': CrimsonContour,
    'Tenshi': Tenshi,
    'TenshiAbstract': TenshiAbstract,
    'ScarletFrame': ScarletFrame,
    'RedMist': RedMist,
    'Impasto_L1': Impasto_L1,
    'Impasto': Impasto,
    'VanGogh': VanGogh,
    'BlueMist': BlueMist,
    'Chalkboard': Chalkboard,
    'BaroqueBrush': BaroqueBrush,
    'BaroqueBrush_2': Baroquebrush_2,
    'pencil_blur': pencil_blur,
    'HopeArt': HopeArt,
    'face2paint': face2paint,
    'crop_and_resize_face_image': crop_and_resize_face_image,
    'apply_broken_glass_effect': apply_broken_glass_effect,
    'Upsample': Upsample,
    'ColorOilPaint': ColorOilPaint
}

# Function for processing a single image:

def process_single_image_with_function(processing_function, input_file, output_file):
    try:
        # Open the image
        img = Image.open(input_file)
        # Call the processing function
        processed_image = processing_function(img)
        if processed_image is not None:
            # Save the image
            if isinstance(processed_image, np.ndarray):
                processed_image = Image.fromarray(processed_image)
            processed_image.save(output_file)
    except Exception as e:
        print(f"Failed to process {input_file}: {e}")

if __name__ == "__main__":
  
    parser = argparse.ArgumentParser(description='Process a single image with a specified filter.')
    parser.add_argument('--input_file', required=True, help='Path to the input image file.')
    parser.add_argument('--output_file', required=True, help='Path to save the output image.')
    parser.add_argument('--filter_name', required=True, help='Name of the filter function to apply.')

    args = parser.parse_args()

    filter_name = args.filter_name

    if filter_name not in filter_functions:
        print(f"Filter '{filter_name}' not found.")
        sys.exit(1)

    processing_function = filter_functions[filter_name]

    process_single_image_with_function(processing_function, args.input_file, args.output_file)
