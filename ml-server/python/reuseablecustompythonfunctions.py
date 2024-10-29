import numpy as np
import os 
import cv2
import torchvision.transforms as T
import matplotlib.pyplot as plt
import glob
import shutil
from matplotlib import rcParams
import torch
from PIL import Image, ExifTags
from torchvision import transforms
import torch.nn as nn
toPIL = transforms.ToPILImage()  
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
gpu_id = torch.cuda.device_count()

def load_model_on_computer(model_path, model):
    """
    Load a model that was trained on a supercomputer with potentially multiple GPUs
    to a normal computer with only one GPU or CPU.

    Parameters:
    - model_path (str): Path to the saved model state dictionary.
    - model (torch.nn.Module): The model architecture into which the state dictionary will be loaded.
    - device (str): The device to load the model onto ('cuda' or 'cpu').

    Returns:
    - model (torch.nn.Module): The model loaded with the state dictionary.
    """
    # Load the state dictionary from the file
    state_dict = torch.load(model_path, map_location=DEVICE)

    # Adjust the keys if they were saved from a multi-GPU setup (DataParallel)
    new_state_dict = {}
    for k, v in state_dict.items():
        if k.startswith('module.'):
            # Remove the 'module.' prefix
            new_state_dict[k[7:]] = v
        else:
            new_state_dict[k] = v

    # Load the adjusted state dictionary into the model
    model.load_state_dict(new_state_dict)

    # Move the model to the desired device
    model = model.to(DEVICE)

    return model

def list_subfolderd_with_others(folder): 
  subfolders = []
  for root, dirs, files in os.walk(folder): 
    if dirs:
      subfolders.append(root) 
  return subfolders

def read_a_image(a_image_path):
   image = cv2.imread(a_image_path)
   image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
   return image

def random_rotation(reference_image, drawing):
  number = np.random.randint(0,360)
  transform = T.RandomRotation(degrees = (number , number),expand=False, center=None)
  rotated_reference_image = transform(reference_image)
  rotated_drawing = transform(drawing)
  return rotated_reference_image, rotated_drawing

def process_images(reference_image_path, drawing_path,is_random_rotation = False):
   reference_image = read_a_image(reference_image_path)
   drawing = read_a_image(drawing_path)
   reference_image = Image.fromarray(reference_image)
   drawing = Image.fromarray(drawing)
   if(is_random_rotation):
     reference_image, drawing = random_rotation(reference_image,drawing)
   return reference_image, drawing

def convert_image_to_tensor(image):
  image = np.ascontiguousarray(image, dtype=np.float32)
  return torch.from_numpy(image).to(DEVICE)

def display_image(img):
  imgplot = plt.imshow(path_to_image(img))
  plt.show()

def display(tensor, title=None):
    image = tensor.cpu().clone()  
    image = image.squeeze(0)    
    image = toPIL(image)
    plt.imshow(image)
    if title is not None:
        plt.title(title)

def path_to_image(path):
  img = Image.open(path).convert('RGB')
  return img

def list_folders_with_one_file(folder): 
  folders = []
  for root, dirs, files in os.walk(folder): 
    if len(files) == 1:
      folders.append(root)
  return folders

def list_folders_with_more_than_one_png(folder): 
  folders = []
  for root, dirs, files in os.walk(folder): 
    pngcount = 0; 
    jpgcount = 0; 
    for f in files: 
      if f.endswith(".png"):
        pngcount += 1
      elif f.endswith(".jpg"): 
        jpgcount += 1
    if pngcount > 1 or jpgcount > 1:
      folders.append(root)
  return folders

def sort_strings(strings): 
  strings.sort(key=lambda x: int(x))
  return strings

def remove_substring(string, substring): 
  index = string.find(substring)
  if index != -1:
    return string.replace(substring, "")
  return string

def get_all_folders(string_images_locations, main_dir):
  file_name_list = []
  for image_location in string_images_locations:
    file_name_list.append(remove_substring(image_location,main_dir + "/"))
  return file_name_list

def list_empty_subfolders(folder): 
  empty_subfolders = [] 
  for root, dirs, files in os.walk(folder): 
    if not dirs and not files:   
      empty_subfolders.append(root) 
  return empty_subfolders

def load_paths(PATHS):
    """Loads all paths for the datasets with image file extensions only."""
    valid_extensions = ('.jpg', '.png', '.jpeg', '.PNG', '.JPG', '.JPEG')
    return {key: sorted([file for file in glob.glob(str(val/'*')) if file.lower().endswith(valid_extensions)]) for key, val in PATHS.items()}

def count_subfolders(folder): 
  subfolder_count = 0
  for root, dirs, files in os.walk(folder): 
    for dir in dirs: 
      subfolder_count += 1
  return subfolder_count

def rotate_image_based_on_exif(image):
    if isinstance(image, str):
        image = Image.open(image)
        
    try:
        for orientation in ExifTags.TAGS.keys() :
            if ExifTags.TAGS[orientation] == 'Orientation':
                break

        exif = dict(image._getexif().items())

        if exif[orientation] == 3 :
            image=image.rotate(180, expand=True)
        elif exif[orientation] == 6 :
            image=image.rotate(270, expand=True)
        elif exif[orientation] == 8 :
            image=image.rotate(90, expand=True)
    except (AttributeError, KeyError, IndexError):
        # In case of issues with EXIF data of the image
        pass
    return image

def process_images_with_normalization(reference_image, drawing):
    # Open the images if file paths are given
    if isinstance(reference_image, str):
        reference_image = Image.open(reference_image).convert("RGB")
        reference_image = rotate_image_based_on_exif(reference_image)
    if isinstance(drawing, str):
        drawing = Image.open(drawing).convert("RGB")
        drawing = rotate_image_based_on_exif(drawing)
    
    # Ensure the images are in RGB format
    if reference_image.mode != 'RGB':
        reference_image = reference_image.convert('RGB')
    if drawing.mode != 'RGB':
        drawing = drawing.convert('RGB')
    
    # Convert images to numpy arrays
    reference_image_np = np.array(reference_image)
    drawing_np = np.array(drawing)
   
    # Normalize the image data to 0-1
    reference_image_np = reference_image_np.astype('float32') / 255.0
    drawing_np = drawing_np.astype('float32') / 255.0
    
    # Convert numpy arrays back to PIL Images
    reference_image = Image.fromarray((reference_image_np * 255).astype(np.uint8))
    drawing = Image.fromarray((drawing_np * 255).astype(np.uint8))

    return reference_image, drawing

def setup_gpus_for_training(model):
    num_gpus = torch.cuda.device_count()
    if num_gpus > 1 :
        print(f"{num_gpus} GPUs are available. Using all available GPSs for trainning.")
        model = nn.DataParallel(model)
    elif num_gpus == 1:
         print("1 GPU is available. Using this for trainning.")
    else:
         print("No GPUs is available. Trainning will be performed on CPU.")
    return model

def load_checkpoint(checkpoint_path, model, optimizer=None, lr=None):
    checkpoint = torch.load(checkpoint_path, map_location=torch.device(DEVICE))
    
    # Adjust for DataParallel if necessary
    state_dict = checkpoint['state_dict']
    if list(state_dict.keys())[0].startswith('module.') and not isinstance(model, nn.DataParallel):
        # If the model is not wrapped in DataParallel but the state_dict has 'module.' prefix, remove it
        new_state_dict = {k[7:]: v for k, v in state_dict.items()}
    elif not list(state_dict.keys())[0].startswith('module.') and isinstance(model, nn.DataParallel):
        # If the model is wrapped in DataParallel but the state_dict lacks 'module.' prefix, add it
        new_state_dict = {'module.' + k: v for k, v in state_dict.items()}
    else:
        new_state_dict = state_dict
    
    model.load_state_dict(new_state_dict)

    if optimizer is not None:
        optimizer.load_state_dict(checkpoint['optimizer'])

    # Adjust learning rate if provided
    if lr is not None and optimizer is not None:
        for param_group in optimizer.param_groups:
            param_group['lr'] = lr

    print("Checkpoint loaded successfully")

def save_checkpoint(model, optimizer, save_file_index, filename="my_checkpoint.pth.tar"):
    print("=> Saving checkpoint")
    checkpoint = {
        "state_dict": model.state_dict(),
        "optimizer": optimizer.state_dict(),
    }
    filename = filename + str(save_file_index) + ".pth.tar"
    torch.save(checkpoint, filename)

def display_original_and_edited_Image(original_Image, edited_Image):
  rcParams['figure.figsize'] = 11,8
  fig,ax = plt.subplots(1,2)
  ax[0].imshow(original_Image)
  ax[1].imshow(edited_Image)
  plt.show()

def test_generator_model_withImage(generator_test_model,image):
  generator_test_model = generator_test_model.to(DEVICE)
  transform_size = T.Resize((512,512))
  transform_To_Tensor = transforms.ToTensor()
  image = transform_size(image)
  image_as_tensor = transform_To_Tensor(image)
  image_as_tensor = image_as_tensor.to(DEVICE) 
  output =  generator_test_model(torch.unsqueeze(image_as_tensor, 0))
  output = output.squeeze().cpu().detach().numpy().transpose(1, 2, 0)  # Added this line
  display_original_and_edited_Image(image,output)

def Get_layers(model):
  layers_list = []
  for name, p in model.named_parameters():
    layers_list.append(name)
  return layers_list

def random_transformation(reference_image,drawing):
  return reference_image,drawing

def read_a_image(a_image_path):
   image = cv2.imread(a_image_path)
   image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
   return image

def load_paths_from_same_folder(PATHS):
    """Loads all paths for the datasets with image file extensions only."""
    valid_extensions = ('.jpg', '.png', '.jpeg', '.PNG', '.JPG', '.JPEG')
    return {key: sorted([file for file in glob.glob(os.path.join(val, '*')) if file.lower().endswith(valid_extensions)]) for key, val in PATHS.items()}

def delete_all_images(folder_path):
    try:
        image_files = glob.glob(os.path.join(folder_path, '*.*'))
        for file in image_files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff')):
                os.remove(file)
                print(f"Deleted: {file}")
        print(f"All images in {folder_path} deleted successfully.")
    except OSError as e:
        print(f"Error deleting files in {folder_path}: {e}")

def directory_delete_all(dir_path):
    # Check if the directory exists
    if os.path.exists(dir_path):
        # If it exists, delete all files inside it
        try:
            # Iterate through all files and folders in the directory
            for filename in os.listdir(dir_path):
                file_path = os.path.join(dir_path, filename)
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.remove(file_path)  # Remove the file or symbolic link
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)  # Remove the directory and all its contents
            print(f"All files in {dir_path} have been deleted.")
        except Exception as e:
            print(f"Error while deleting files in {dir_path}: {e}")
    else:
        # If it does not exist, create the directory
        os.makedirs(dir_path)
        print(f"Directory {dir_path} created.")

def tensor2im(image_tensor, imtype=np.uint8, normalize=True):
    if isinstance(image_tensor, list):
        image_numpy = []
        for i in range(len(image_tensor)):
            image_numpy.append(tensor2im(image_tensor[i], imtype, normalize))
        return image_numpy

    # Ensure the tensor is on the CPU and has the right shape
    image_tensor = image_tensor.squeeze()  # Remove batch dimension if present
    image_numpy = image_tensor.cpu().float().numpy()

    # Check if the image has the right number of dimensions (C, H, W)
    if image_numpy.ndim == 2:  # Single channel image, already in H, W format
        image_numpy = image_numpy[:, :, np.newaxis]  # Add channel axis

    # Transpose (C, H, W) -> (H, W, C)
    if normalize:
        image_numpy = (np.transpose(image_numpy, (1, 2, 0)) + 1) / 2.0 * 255.0
    else:
        image_numpy = np.transpose(image_numpy, (1, 2, 0)) * 255.0

    image_numpy = np.clip(image_numpy, 0, 255)

    # Handle single-channel (grayscale) or extra channels (e.g., alpha)
    if image_numpy.shape[2] == 1 or image_numpy.shape[2] > 3:
        image_numpy = image_numpy[:, :, 0]  # Convert to 2D if needed

    return image_numpy.astype(imtype)

def TurnBlue(img):
  if img.dtype == np.float32 or img.dtype == np.float64:
    if img.max() <= 1.0:
      img = (255 * img).astype(np.uint8)
    else:
      img = img.astype(np.uint8)
  else:
     img = img.astype(np.uint8)   
  blue_image = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
  return blue_image
