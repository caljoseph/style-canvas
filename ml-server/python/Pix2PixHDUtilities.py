import torch
import torch.nn as nn
from tqdm import tqdm
from torchvision.utils import save_image
import networks as Networks
import os
from PIL import Image
import reuseablecustompythonfunctions as rcpf
from torchvision import transforms as T
import matplotlib.pyplot as plt
import torchvision.transforms.functional as TF
import cv2
import tkinter as tk
from tkinter import filedialog
import time
import FaceDetectorLib as FCL
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

def process_image(image):
    """
    Process an image by resizing, converting to tensor, and normalizing.
    This function expects a PIL.Image as input and returns a normalized tensor.

    Returns:
    torch.Tensor: The processed image tensor, ready for model input.
    """
    # Define the transformation pipeline
    transformation_pipeline = T.Compose([
        T.ToTensor(),                      # Convert the image to a tensor
        T.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))  # Normalize the tensor
    ])
    
    # Apply the transformations
    processed_image = transformation_pipeline(image)
    return processed_image

def process_image_custom_norm(image):
    """
    Process an image by resizing, converting to tensor, and normalizing.
    This function expects a PIL.Image as input and returns a normalized tensor.

    Returns:
    torch.Tensor: The processed image tensor, ready for model input.
    """
    # Define the transformation pipeline
    transformation_pipeline = T.Compose([
        T.ToTensor(),                      # Convert the image to a tensor
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])  # Normalize the tensor
    ])
    
    # Apply the transformations
    processed_image = transformation_pipeline(image)
    return processed_image

def process_image_without_normalize(image, img_height=1024, img_width=1024):
    """

    Args:
    image (PIL.Image): The image to process.
    img_height (int): The target height of the image after resizing.
    img_width (int): The target width of the image after resizing.
    
    Returns:
    torch.Tensor: The processed image tensor, ready for model input.
    """
    # Define the transformation pipeline
    transformation_pipeline = T.Compose([
        T.Resize((img_height, img_width)),  # Resize the image to the specified dimensions
        T.ToTensor()                      # Convert the image to a tensor
    ])
    
    # Apply the transformations
    processed_image = transformation_pipeline(image)
    return processed_image


def get_generator_model(load_checkpoint_gen, ngf = 128,  generator_input_nc = 3,generator_output_nc = 3 ):
    print("Setting up AI model")
    num_gpus = torch.cuda.device_count()
    gpu_ids = list(range(num_gpus))
    generator_model = Networks.define_G(generator_input_nc, generator_output_nc, ngf, 'global', gpu_ids=gpu_ids)
    generator_model = generator_model.to(DEVICE)
    generator_model = setup_gpus_for_training(generator_model)
    print("Loading Generator Weights ")
    load_checkpoint(load_checkpoint_gen, generator_model)
    generator_model = generator_model.eval()
    return generator_model

def setup_gpus_for_training(model):
    num_gpus = torch.cuda.device_count()
    if num_gpus > 1:
        model = nn.DataParallel(model)
    return model

def load_checkpoint(checkpoint_path, model):
    checkpoint = torch.load(checkpoint_path, map_location='cpu')

    from collections import OrderedDict
    new_state_dict = OrderedDict()

    for k, v in checkpoint['state_dict'].items():
        name = k[7:] if k.startswith('module.') else 'module.' + k  # strip or add 'module.' prefix
        new_state_dict[name] = v

    model.load_state_dict(new_state_dict)

def denormalize(tensor, mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]):
    """
    Denormalize a tensor image with mean and std.
    """
    # Clone the tensor to not do changes in-place
    denorm_tensor = tensor.clone()
    for t, m, s in zip(denorm_tensor, mean, std):  # Loop over 3 channels
        t.mul_(s).add_(m)  # Multiply by std and add the mean
    return denorm_tensor

def save_images(x, y, image_saved_count = 1, Output_Folder = r"./Test_OutPut",  clear_up = None):
    # Create a new directory for the current image set
    image_set_folder = os.path.join(Output_Folder , str(image_saved_count))
    os.makedirs(image_set_folder, exist_ok=True)  # Creates the directory if it doesn't exist

    # Denormalize the input and generated images
    x_denorm = denormalize(x)

    # Save the images in the created directory
    save_image(x_denorm, os.path.join(image_set_folder, "Reference_Image.png"))
    save_image(y, os.path.join(image_set_folder, "Generated_Image.png"))
    if(clear_up is not None):
        save_image(clear_up, os.path.join(image_set_folder, "clear_up_Generated_Image.png"))

def save_image_numpy(image_numpy, image_path):
    image_pil = Image.fromarray(image_numpy)
    image_pil.save(image_path)

def apply_filter_to_image(generator_model, input_tensor):
    input_tensor = input_tensor.unsqueeze(0)
    input_tensor = input_tensor.to(DEVICE)
    with torch.no_grad():
        generated_image_tensor = generator_model(input_tensor)
    return generated_image_tensor

def get_image(reference_image_path, img_width=1024, img_height=1024):
    if isinstance(reference_image_path, str):
        reference_image = Image.open(reference_image_path)
        reference_image = rcpf.rotate_image_based_on_exif(reference_image)
        reference_tensor = process_image(reference_image, img_height, img_width)
    return reference_tensor

def get_image_of_model(reference_image_path, img_width=1024, img_height=1024):
    if isinstance(reference_image_path, str):
        reference_image = FCL.process_image_from_path(reference_image_path, img_width, img_height)
        reference_tensor = process_image(reference_image)
        reference_tensor = reference_tensor.unsqueeze(0)
    return reference_tensor

def process_image_for_model_custom_norm(image, img_width=512, img_height=512):
     reference_image = FCL.resize_image(image, img_width, img_height)
     reference_tensor = process_image_custom_norm(reference_image)
     return  reference_tensor.unsqueeze(0)

def process_image_for_model(image, img_width=512, img_height=512):
     reference_image = FCL.resize_image(image, img_width, img_height)
     reference_tensor = process_image(reference_image)
     return  reference_tensor.unsqueeze(0)


def get_original_image(reference_image_path, img_width=1024, img_height=1024):
    if isinstance(reference_image_path, str):
        reference_image = FCL.process_image_from_path(reference_image_path)
        reference_tensor = process_image_without_normalize(reference_image, img_height, img_width)
    return reference_tensor

def get_image_count(folder_path):
    folder_items = rcpf.load_paths(folder_path)
    return len(folder_items)

def display_images(reference_tensor, generated_tensor):
    # Convert tensors to PIL Images for displaying
    reference_image = TF.to_pil_image(denormalize(reference_tensor).clamp(0, 1))
    generated_image = TF.to_pil_image(generated_tensor)

    fig, axes = plt.subplots(1, 2, figsize=(12, 6))
    axes[0].imshow(reference_image)
    axes[0].set_title("Reference Image")
    axes[0].axis('off')

    axes[1].imshow(generated_image)
    axes[1].set_title("Generated Image")
    axes[1].axis('off')

    plt.show()

def denormalize_for_display(tensor):
    """
    Denormalizes a tensor using the mean and std deviation used for normalization.
    """
    mean = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
    std = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
    return tensor * std + mean

def filter_images_in_directory(load_checkpoint_gen, source_folder, destination_folder, img_height=1024, img_width=1024, ngf = 128 ):
  generator_model = get_generator_model(load_checkpoint_gen, ngf)
  print("Creating a list of image to process")
  image_paths = os.listdir(source_folder)
  loop = tqdm(image_paths, leave=True)
  image_counter =1
  for image_name in loop:
    image_path = os.path.join(source_folder, image_name)
    try:
        input_image_tensor = get_image(image_path, img_height, img_width)
        print(f"Input Tensor Shape: {input_image_tensor.shape}, Type: {type(input_image_tensor)}")
        generated_image_tensor = apply_filter_to_image(generator_model, input_image_tensor)
        print(f"Output Tensor Shape: {generated_image_tensor.shape}, Type: {type(generated_image_tensor)}")
        generated_image_tensor = generated_image_tensor.squeeze(0)
        save_images(input_image_tensor, generated_image_tensor, image_counter, destination_folder)
        image_counter += 1
    except Exception as e:
        print(f"Failed to process {image_name}: {e}")


def filter_images_from_Camera(load_checkpoint_gen, image_path, destination_folder ):
  generator_model = get_generator_model(load_checkpoint_gen)
  image_counter =1
  try:
    input_image_tensor = get_image(image_path)
    generated_image_tensor = apply_filter_to_image(generator_model, input_image_tensor)
    display_images(input_image_tensor, generated_image_tensor)
    save_images(input_image_tensor,generated_image_tensor, image_counter, destination_folder)
    image_counter = image_counter +1 
  except Exception as e:
        print(f"Failed to process {image_path}: {e}")

def Apply_filter_To_Image(image_path):
    image_counter = 1
    load_checkpoint_gen = r"./Models/Gen_Chalk_Photo_Effect_128.pth.tar"
    generator_model = get_generator_model(load_checkpoint_gen)
    try:
        input_image_tensor = get_image(image_path)
        generated_image_tensor = apply_filter_to_image(generator_model, input_image_tensor)
        save_images(input_image_tensor,generated_image_tensor, image_counter, destination_folder)
        image_counter = image_counter +1 
        return input_image_tensor, generated_image_tensor
    except Exception as e:
        print(f"Failed to process {image_path}: {e}")

def take_photo(filename='photo.jpg', quality=95):
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Trying to open webcam again...")
        cv2.destroyAllWindows()
        cap.open(0)
        if not cap.isOpened():
            raise ValueError("Failed to open webcam after retry.")
        else:
            print("Webcam successfully opened after retry.")

    # Let the camera warm up
    time.sleep(2)  # Wait for 2 seconds to let the camera initialize properly

    ret, frame = cap.read()
    if not ret:
        cap.release()
        raise ValueError("Failed to capture image. Camera read unsuccessful.")
    
    cv2.imwrite(filename, frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    cap.release()

    print("Webcam opened:", cap.isOpened())
    print("Image captured:", ret)

    # Ensure the filename is correctly passed to the system command
    os.system(f'start "" "{filename}"')
    return filename

def browse_image():
    # Create a root window but don't display it
    root = tk.Tk()
    root.withdraw()  # Hide the root window

    # Open the file dialog and allow selection of image files
    file_path = filedialog.askopenfilename(
        title="Select an image",
        filetypes=[("Image files", "*.jpeg;*.jpg;*.png;*.gif;*.bmp")])  # Adjust file types according to need

    # Return the full path of the selected file
    return file_path


if __name__ == "__main__":
    #image_path = take_photo
    load_checkpoint_gen = r"./Models/Gen_Chalk_Photo_Effect_128.pth.tar"
    source_folder = r'./TestData/Val_images'
    destination_folder = r"./Chalk_Effect"
    test_images = r'./TestImages'
    #Apply_filter_To_Image(image_path)
    filter_images_in_directory(load_checkpoint_gen, test_images, destination_folder)
    
