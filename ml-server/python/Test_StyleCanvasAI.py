import torch
from tqdm import tqdm
import os
from S2ModelConfigurations import S2ModelConfigurations
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
from ImageSaver import ImageSaver
from InferenceImageProcessor import InferenceImageProcessor
from DiffI2I_Inference import DiffI2IManager


def Run_S2_Model(SC3_Parameters):
    destination_subfolder_name = r"./Test_Output"
    source_folder = r'./TestImages'
    destination_folder = os.path.join(destination_subfolder_name, SC3_Parameters.Checkpoint_Name)
    image_saver = ImageSaver(destination_folder)

    processor_images = InferenceImageProcessor(SC3_Parameters.img_height, SC3_Parameters.img_width)

    # Initialize the DiffI2IManager
    manager = DiffI2IManager(SC3_Parameters)

    # Load images as a list of tensors
    images = processor_images.image_loader(source_folder)

    # Display each processed image using tqdm for the progress bar
    for idx, (img, image_name) in enumerate(tqdm(images, leave=True)):
        with torch.no_grad():  # Ensure no gradient tracking during inference
            drawing = manager.run_Diffi2i_S2(img)
            if drawing is not None:
                image_saver.save_tensor(image_name, drawing)

    # Ensure all CUDA operations are finished
    torch.cuda.synchronize()

    # Free up GPU memory
    del manager  # Delete the model to free up memory
    torch.cuda.empty_cache()  # Clear the CUDA cache


def test_all_Models():
    Run_S2_Model(S2ModelConfigurations.SC3_Parameters)
    torch.cuda.empty_cache()
    Run_S2_Model(S2ModelConfigurations.OilPainting_MaxT_Parameters)
    
    # Usage Example
if __name__ == '__main__':
    test_all_Models()