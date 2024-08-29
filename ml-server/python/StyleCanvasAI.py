import Face_Parsing_Model as fpm
import AdobeFilterModelLib as afm
import ChalkboardFilterLib as cbf
from Face_Parsing_Model import FaceDrawingTypes
from PIL import Image
import os
import reuseablecustompythonfunctions as rcpf
from tqdm import tqdm
from ImageSaver import ImageSaver
from natsort import natsorted
from options.test_options import TestOptions

def BlueShadeFace(img):
    face_drawing_styles = FaceDrawingTypes.MonochromeBlue
    drawing = fpm.Get_Face_Drawing(img, face_drawing_styles )
    return drawing

def CrimsonCanvas(img):
    face_drawing_styles = FaceDrawingTypes.RedHaired
    drawing = fpm.Get_Face_Drawing(img, face_drawing_styles, True, True)
    return drawing

def CrimsonContour(img):
    face_drawing_styles = FaceDrawingTypes.RedHaired
    drawing = fpm.Get_Face_Drawing(img, face_drawing_styles)
    return drawing

def DarkColorBlend(img):
    face_drawing_styles = FaceDrawingTypes.Hauna
    drawing = fpm.Get_Face_Drawing(img, face_drawing_styles, False, True)
    return drawing

def DotLineFace(img):
    face_drawing_styles = FaceDrawingTypes.Line_Work
    drawing = fpm.Get_Face_Drawing(img, face_drawing_styles, False, False, True)
    return drawing

def RedMist(img):
    ai_model_name = 'HellFire'
    which_epoch= 16
    ngf = 128
    red_mist = afm.apply_filter_to_image(img, ai_model_name, which_epoch, ngf)
    return red_mist

def VanGogh(img):
    ai_model_name = 'VanGogh_OB'
    van_gogh = afm.apply_filter_to_image(img, ai_model_name)
    return van_gogh


def A_Face_OilPainting(img):
    ai_model_name = 'A_Face_OilPainting'
    which_epoch= 10
    ngf = 64
    A_Face_OilPainting = afm.apply_filter_to_image(img, ai_model_name, which_epoch)
    return A_Face_OilPainting


def BlueMist(img):
    red_mist = RedMist(img)
    blue_mist  =  rcpf.TurnBlue(red_mist)
    return blue_mist

def Chalkboard(img):
    chalk_board = cbf.apply_chalkboard_Filter(img)
    return chalk_board

def CrimsonContour(img):
    face_drawing_styles = FaceDrawingTypes.RedHaired
    drawing = fpm.Get_Face_Drawing(img, face_drawing_styles, True)
    return drawing

def TenshiAbstract(img):
    face_drawing_styles = FaceDrawingTypes.Tenshi
    drawing = fpm.Get_Face_Drawing(img, face_drawing_styles)
    return drawing


def apply_filter(img, filter_name):
    filter_functions = {
        "BlueShadeFace": BlueShadeFace,
        "CrimsonCanvas": CrimsonCanvas,
        "CrimsonContour": CrimsonContour,
        "DarkColorBlend": DarkColorBlend,
        "DotLineFace": DotLineFace,
        "RedMist": RedMist,
        "VanGogh": VanGogh,
        "A_Face_OilPainting": A_Face_OilPainting,
        "BlueMist": BlueMist,
        "Chalkboard": Chalkboard,
        "TenshiAbstract": TenshiAbstract
    }
    return filter_functions.get(filter_name, lambda x: x)(img)

def process_images(input_path, output_path, filter_name):
    fpm.use_default_face_model = True

    if not os.path.exists(output_path):
        os.makedirs(output_path)

    image_saver = ImageSaver(output_path)

    input_files = [f for f in os.listdir(input_path) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif'))]

    if not input_files:
        print(f"No valid image files found in {input_path}")
        return

    for image_name in input_files:
        image_path = os.path.join(input_path, image_name)
        try:
            img = Image.open(image_path)
            drawing = apply_filter(img, filter_name)
            if drawing is not None:
                image_saver.save_image(image_name, drawing)
                print(f"Successfully processed {image_name}")
            else:
                print(f"Failed to apply filter to {image_name}: No output image generated")
        except Exception as e:
            print(f"Failed to process {image_name}: {e}")

# def process_single_image(image_path, image_name, filter_name, image_saver):
#     try:
#         img = Image.open(image_path)
#         drawing = apply_filter(img, filter_name)
#         if drawing is not None:
#             image_saver.save_image(image_name, drawing)
#         else:
#             print(f"Failed to apply filter to {image_name}: No output image generated")
#     except Exception as e:
#         print(f"Failed to process {image_name}: {e}")

def main():
    opt = TestOptions().parse()
    process_images(opt.input_path, opt.output_path, opt.filter_name)


if __name__ == "__main__":
    main()