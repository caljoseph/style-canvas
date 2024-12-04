import numpy as np
import cv2
import torch
import torchvision.transforms as T
from PIL import Image, ExifTags
from torchvision import transforms
import torch.nn as nn
toPIL = transforms.ToPILImage()  
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
gpu_id = torch.cuda.device_count()


def load_image(input_image):
    if isinstance(input_image, str):
        input_image = Image.open(input_image)
    return input_image

def normalize_images(input_image):
    # Convert images to numpy arrays
    input_image_np = np.array(input_image)

    # Normalize the image data to 0-1
    input_image_np = input_image_np.astype('float32') / 255.0

    # Convert numpy arrays back to PIL Images
    input_image = Image.fromarray((input_image_np * 255).astype(np.uint8))

    return input_image

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

def setup_gpus(model):
    num_gpus = torch.cuda.device_count()
    if num_gpus > 1 :
        print(f"{num_gpus} GPUs are available. Using all available GPSs.")
        model = nn.DataParallel(model)
    elif num_gpus == 1:
         print("1 GPU is available.")
    else:
         print("No GPUs is available.")
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

def process_face_image(image):
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