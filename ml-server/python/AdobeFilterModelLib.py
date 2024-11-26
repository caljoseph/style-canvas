import os
import torch
from tqdm import tqdm
from models.models import create_model
from options.AdobefilterDefaultOptions import AdobefilterDefaultOptions
import Pix2PixHDUtilities as p2pUtil
from ImageSaver import ImageSaver
from FaceImageProcessor import FaceImageProcessor
import style_canvas_utils as rcpf


def GetAdobeFilterModel(ai_model_name, which_epoch, ngf = 64, n_local_enhancers = 2):
    options = AdobefilterDefaultOptions(ai_model_name, which_epoch, ngf, n_local_enhancers)
    AdobeFilterModel = create_model(options)
    return AdobeFilterModel

def apply_filter_to_image(img, ai_model_name, which_epoch='latest', ngf = 64, n_local_enhancers = 2, img_height=1024, img_width=1024):
    AdobeFilterModel = GetAdobeFilterModel(ai_model_name,  which_epoch, ngf, n_local_enhancers)
    processor_images = FaceImageProcessor(img_height, img_width)
    input_image_tensor = processor_images.process_image2(img)
    inst_temp = torch.zeros((1,), dtype=torch.long)
    image_temp = torch.zeros((1,), dtype=torch.long)
    with torch.no_grad():  # Disable gradient computation
        generated_image_tensor = AdobeFilterModel.inference(input_image_tensor, inst_temp, image_temp)
        if torch.cuda.is_available():
            torch.cuda.synchronize()  # Ensure all CUDA operations are finished
            torch.cuda.empty_cache()  # Clear the CUDA cache to free up memory
    generated_image = rcpf.tensor2im(generated_image_tensor)
    return generated_image
                
def apply_filter_to_images(ai_model_name, source_folder, destination_folder, which_epoch='latest', img_height=1024, img_width=1024):
    image_paths = os.listdir(source_folder)
    source_image_count = len(image_paths)
    AdobeFilterModel = GetAdobeFilterModel(ai_model_name, source_image_count, which_epoch)
    
    image_saver = ImageSaver(destination_folder)
    print("Creating a list of images to process")
    loop = tqdm(image_paths, leave=True)
    
    for image_name in loop:
        image_path = os.path.join(source_folder, image_name)
        try:
            with torch.no_grad():  # Disable gradient computation
                input_image_tensor = p2pUtil.get_image_of_model(image_path, img_height, img_width)
                inst_temp = torch.zeros((1,), dtype=torch.long)
                image_temp = torch.zeros((1,), dtype=torch.long)
                generated_image_tensor = AdobeFilterModel.inference(input_image_tensor, inst_temp, image_temp)
                generated_image = rcpf.tensor2im(generated_image_tensor)
                image_saver.save_image_2(image_name, generated_image)
        except Exception as e:
            print(f"Failed to process {image_name}: {e}")
 
def apply_face_parsing(img):
    ai_model_name = 'Face_Parsing_1024X1024'
    which_epoch= 10
    face_parsing = apply_filter_to_image(img, ai_model_name, which_epoch)
    return face_parsing

if __name__ == "__main__": 
    ai_model_name = 'HellFire'
    which_epoch = 16
    destination_folder = r"./Test_OutPut"
    test_images_NobackGround =  r"./TestImages"  
    test_images = r'./TestImages'
    apply_filter_to_images(ai_model_name, test_images, destination_folder, which_epoch)