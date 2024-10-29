import Face_Parsing_Model as fpm
import AdobeFilterModelLib as afm
import ChalkboardFilterLib as cbf
import Face2Paint as f2p
import Diff_I2I_lib as Diff
from Face_Parsing_Model import FaceDrawingTypes 
import os
import reuseablecustompythonfunctions as rcpf
from tqdm import tqdm
from ImageSaver import ImageSaver
import numpy as np
from InferenceImageProcessor import InferenceImageProcessor
from PIL import Image, ImageChops
from natsort import natsorted

fpm.use_default_face_model = True

def D256_LE_2_FACE_PARSING(img):
    face_parsing = fpm.get_FaceParsing_image(img)
    return  rcpf.tensor2im(face_parsing)

def Sketches_T5(img):
    return  Diff.Sketches_T5(img)

def FaceParsing_T1(img):
    face_parsing = Diff.FaceParsing_T1(img)
    return  rcpf.tensor2im(face_parsing, normalize=False)

def FaceParsing_T2(img):
    face_parsing = Diff.FaceParsing_T2(img)
    return  rcpf.tensor2im(face_parsing, normalize=False)

def process_images_with_function(processing_function):
    source_folder = r'./TestImages'
    destination_root_folder = r"./Results"
    destination_subfolder_name = processing_function.__name__
    destination_folder = os.path.join(destination_root_folder, destination_subfolder_name)
    
    # Create destination folder if it doesn't exist
    if not os.path.exists(destination_folder):
        os.makedirs(destination_folder)

    image_paths = natsorted(os.listdir(source_folder))  # Sort images alphabetically and numerically
    image_saver = ImageSaver(destination_folder)  # Assuming ImageSaver is defined elsewhere
    loop = tqdm(image_paths, leave=True)

    for image_name in loop:
        try:
            # Check if file is an image
            if image_name.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')):
                image_path = os.path.join(source_folder, image_name)
                img = Image.open(image_path)
                # Call the function passed in to process the image
                processed_image = processing_function(img) 
                if processed_image is not None:
                    image_saver.save_image(image_name, processed_image)
        except Exception as e:
            print(f"Failed to process {image_name}: {e}")

if __name__ == "__main__": 
    process_images_with_function(FaceParsing_T2)
 