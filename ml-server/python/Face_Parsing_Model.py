import os
import torch
from tqdm import tqdm
from models.models import create_model
from options.face_parsing_options import FaceParsingOptions
from options.enhanced_face_parsing import Enhanced_Face_Parsing
import Pix2PixHDUtilities as p2pUtil
import numpy as np
from ImageSaver import ImageSaver
import matplotlib.pyplot as plt
from skimage.morphology import square, opening, closing
import cv2
import FlatFaceOption as FFO
import Face_Art as FA
from scipy.spatial.distance import cdist
from skimage import morphology
from InferenceImageProcessor import InferenceImageProcessor
from enum import Enum, auto
import AdobeFilterModelLib as afm
import Diff_I2I_lib as Diff

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
img_height=512
img_width=512

is_face_model_loaded = False
FaceParser = None
use_default_face_model = True


def fit_ear_shape(ear_mask, min_area=50):
    """
    Smooth and refine the ear shape, ensuring that only the largest connected component (blob) remains.
    The final shape should resemble a "C" shape, typical for an ear contour.
    
    Parameters:
        ear_mask (numpy.ndarray): The binary mask for the ear region.
        min_area (int): The minimum area for a blob to be considered valid.
        
    Returns:
        numpy.ndarray: The refined ear mask with only the largest blob retained and adjusted for a "C" shape.
    """
    # Step 1: Convert mask to binary if it's not already
    ear_mask_binary = (ear_mask > 0).astype(np.uint8)
    
    # Step 2: Apply morphological closing to smooth the edges
    selem = square(3)  # You can adjust the structuring element size to control the smoothing
    smoothed_mask = closing(ear_mask_binary, selem)
    
    # Step 3: Detect blobs (connected components)
    num_labels, labels_im, stats, _ = cv2.connectedComponentsWithStats(smoothed_mask, connectivity=8)
    
    # Step 4: Retain only the largest blob
    if num_labels > 1:
        # Find the largest blob, ignoring the background (label 0)
        largest_blob_index = np.argmax(stats[1:, cv2.CC_STAT_AREA]) + 1  # Index starts from 1 (ignores the background)
        
        # Create a mask with only the largest blob
        largest_blob_mask = (labels_im == largest_blob_index).astype(np.uint8) * 255
        
        # Optional: Remove smaller blobs
        for label in range(1, num_labels):
            if label != largest_blob_index and stats[label, cv2.CC_STAT_AREA] < min_area:
                smoothed_mask[labels_im == label] = 0
    else:
        largest_blob_mask = smoothed_mask

    # Step 5: Refine the shape to resemble a "C"
    contours, _ = cv2.findContours(largest_blob_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        # Approximate the contour to smooth it out
        epsilon = 0.02 * cv2.arcLength(contours[0], True)
        approx = cv2.approxPolyDP(contours[0], epsilon, True)

        # Check if the contour is too far from a "C" shape, and if so, reshape
        if len(approx) > 5:  # Too many points, likely not a "C"
            hull = cv2.convexHull(contours[0])  # Create a convex hull to simplify the shape
            cv2.drawContours(largest_blob_mask, [hull], -1, (255), thickness=-1)

    return largest_blob_mask.astype(np.uint8) * 255

def fit_lip_shape(lip_mask, min_area=50):
    """
    Smooth and refine the lip shape, ensuring that only the largest connected component (blob) remains.
    
    Parameters:
        lip_mask (numpy.ndarray): The binary mask for the lip region.
        min_area (int): The minimum area for a blob to be considered valid.
        
    Returns:
        numpy.ndarray: The refined lip mask with only the largest blob retained.
    """
    # Step 1: Convert mask to binary if it's not already
    lip_mask_binary = (lip_mask > 0).astype(np.uint8)
    
    # Step 2: Apply morphological closing to smooth the edges
    selem = square(3)  # You can adjust the structuring element size to control the smoothing
    smoothed_mask = closing(lip_mask_binary, selem)
    
    # Step 3: Detect blobs (connected components)
    num_labels, labels_im, stats, _ = cv2.connectedComponentsWithStats(smoothed_mask, connectivity=8)
    
    # Step 4: Retain only the largest blob
    if num_labels > 1:
        # Find the largest blob, ignoring the background (label 0)
        largest_blob_index = np.argmax(stats[1:, cv2.CC_STAT_AREA]) + 1  # Index starts from 1 (ignores the background)
        
        # Create a mask with only the largest blob
        largest_blob_mask = (labels_im == largest_blob_index).astype(np.uint8) * 255
        
        # Optional: Remove smaller blobs
        for label in range(1, num_labels):
            if label != largest_blob_index and stats[label, cv2.CC_STAT_AREA] < min_area:
                smoothed_mask[labels_im == label] = 0
    else:
        largest_blob_mask = smoothed_mask

    return largest_blob_mask.astype(np.uint8) * 255

class FaceDrawingTypes(Enum):
    DarkColorBlend= 1
    Tenshi= 2
    Line_Work = 3
    abstract_face_lines = 4
    Supreme_Kai_Faces = 5
    Faceless_1 = 6
    CrimsonCanvas = 7
    BlueShade = 8
    TriadicGlow = 9
    TriadicVision =10
    TriadShade = 11
    abstract_RedHaired = 12
    ScarletFrame = 13
    TenshiAbstract = 14

class FaceParsingModelType(Enum):
    F256_FACE_PARSING = auto()
    D256_LE_2_FACE_PARSING = auto()
    D128_FACE_PARSING = auto()
    G128_FACE_PARSING = auto()
    SUPER_FACE_PARSING = auto()
    Enhanced_Face_Parsing = auto()

face_segment_indices = {
    "background": 0,
    "head_face": 1,
    "l_brow": 2,
    "r_brow": 3,
    "l_eye": 4,
    "r_eye": 5,
    "eyeglasses": 6,
    "l_ear": 7,
    "r_ear": 8,
    "ear_r": 9,
    "nose": 10,
    "mouth": 11,
    "upper_lip": 12,
    "lower_lip": 13,
    "neck": 14,
    "neck_l": 15,
    "cloth": 16,
    "hair": 17,
    "hat": 18
}

def merge_nearby_shapes(tensor, distance_threshold=10):
    """
    Merge nearby shapes in each layer of the tensor.
    
    Parameters:
        tensor (torch.Tensor): The input tensor with shape [C, H, W] where each channel is a binary mask.
        distance_threshold (int): The distance threshold for merging nearby shapes.
    
    Returns:
        torch.Tensor: The processed tensor with nearby shapes merged.
    """
    if tensor.dim() != 3:
        raise ValueError("Tensor must be 3-dimensional [C, H, W]")

    tensor_np = tensor.cpu().numpy()
    processed_tensor_np = np.zeros_like(tensor_np, dtype=np.uint8)
    
    for i in range(tensor_np.shape[0]):
        if i in [face_segment_indices["hair"], face_segment_indices["ear_r"], face_segment_indices["cloth"]]:
            processed_tensor_np[i] = tensor_np[i]
            continue
        
        mask = tensor_np[i]
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)

        if num_labels <= 2:  # If there is one or no shapes, skip
            processed_tensor_np[i] = mask
            continue

        # Calculate pairwise distances between centroids
        distances = cdist(centroids[1:], centroids[1:])

        # Create a union-find structure to merge close components
        parent = list(range(num_labels - 1))

        def find(x):
            if parent[x] == x:
                return x
            parent[x] = find(parent[x])
            return parent[x]

        def union(x, y):
            rootX = find(x)
            rootY = find(y)
            if rootX != rootY:
                parent[rootY] = rootX

        for j in range(num_labels - 1):
            for k in range(j + 1, num_labels - 1):
                if distances[j, k] < distance_threshold:
                    union(j, k)

        # Apply union-find to create new labels
        new_labels = np.zeros_like(labels)
        label_map = {}
        current_label = 1
        for j in range(1, num_labels):
            root = find(j - 1)
            if root not in label_map:
                label_map[root] = current_label
                current_label += 1
            new_labels[labels == j] = label_map[root]

        processed_mask = np.zeros_like(mask, dtype=np.uint8)
        for j in range(1, current_label):
            processed_mask[new_labels == j] = 255

        processed_tensor_np[i] = processed_mask

    processed_tensor = torch.from_numpy(processed_tensor_np).type(torch.uint8)
    return processed_tensor

def remove_small_objects(tensor, min_size=64, connectivity=2):
    """
    Remove small white objects from binary masks in a tensor.
    
    Parameters:
        tensor (torch.Tensor): The input tensor with shape [C, H, W] where each channel is a binary mask.
        min_size (int): The minimum size of objects to keep.
        connectivity (int): Connectivity used for defining neighbors (1, 2, or 3).
    
    Returns:
        torch.Tensor: The processed tensor with small objects removed.
    """
    if tensor.dim() != 3:
        raise ValueError("Tensor must be 3-dimensional [C, H, W]")

    # Move tensor to CPU and convert to numpy for processing
    tensor_np = tensor.cpu().numpy()
    processed_tensor_np = np.zeros_like(tensor_np, dtype=np.uint8)

    for i in range(tensor_np.shape[0]):
        # Apply morphological opening to remove small objects
        mask = tensor_np[i]
        # Since the input is expected to be binary (0 or 255), we need to convert it to boolean first
        bool_mask = mask.astype(np.bool_)
        cleaned_mask = morphology.remove_small_objects(bool_mask, min_size=min_size, connectivity=connectivity)
        # Convert boolean mask back to uint8
        processed_tensor_np[i] = cleaned_mask.astype(np.uint8) * 255

    # Convert the processed numpy array back to a PyTorch tensor
    processed_tensor = torch.from_numpy(processed_tensor_np).type(torch.uint8)

    return processed_tensor

def tensor2im(image_tensor, normalize=False, imtype=np.uint8):
    if isinstance(image_tensor, list):
        image_numpy = [tensor2im(item, imtype, normalize) for item in image_tensor]
        return image_numpy
    if image_tensor.dim() == 4 and image_tensor.shape[0] == 1:
        image_tensor = image_tensor.squeeze(0)  # Remove batch dimension if it's 1

    image_numpy = image_tensor.cpu().float().numpy()
    if image_tensor.dim() == 3:  # C, H, W
        if normalize:
            image_numpy = (np.transpose(image_numpy, (1, 2, 0)) + 1) / 2.0 * 255.0
        else:
            image_numpy = np.transpose(image_numpy, (1, 2, 0)) * 255.0
        image_numpy = np.clip(image_numpy, 0, 255)
        if image_numpy.shape[2] == 1 or image_numpy.shape[2] > 3:
            image_numpy = image_numpy[:, :, 0]
    else:
        raise ValueError("Unexpected tensor dimensions: {}".format(image_tensor.shape))

    return image_numpy.astype(imtype)

colors = {
        0: [255, 255, 255],  # background
        1: [128, 0, 128],    # head/face
        2: [255, 0, 0],      # l_brow
        3: [0, 255, 0],      # r_brow
        4: [0, 0, 255],      # l_eye
        5: [255, 165, 0],    # r_eye
        6: [0, 255, 255],    # eyeglasses
        7: [128, 128, 0],    # l_ear
        8: [127, 127, 127],   # r_ear
        9: [0, 128, 128],    # ear_r
        10: [255, 20, 147],  # nose
        11: [255, 215, 0],   # mouth
        12: [75, 0, 130],    # u_lip
        13: [255, 105, 180], # l_lip
        14: [173, 216, 230], # neck
        15: [0, 128, 0],     # neck_l
        16: [139, 69, 19],   # cloth
        17: [0, 0, 0],       # hair
        18: [192, 192, 192]  # hat
    }

class Pixel:
    def __init__(self, red, green, blue):
        self.red = red
        self.green = green
        self.blue = blue

def distance_equation(target_colors, pixel_colors):
    # Calculate squared Euclidean distance to avoid unnecessary square root computation
    diff = target_colors[:, np.newaxis, np.newaxis, :] - pixel_colors[np.newaxis, :, :, :]
    dist = np.sum(diff**2, axis=3)
    return dist

def create_color_masks(input_array):
    # Ensure the input is a numpy array of type np.uint8
    if not isinstance(input_array, np.ndarray) or input_array.dtype != np.uint8:
        raise ValueError("Input array must be a numpy array with dtype np.uint8")

    # Define the target colors
    target_colors_data = [
        [255, 255, 255], [128, 0, 128], [255, 0, 0],
        [0, 255, 0], [0, 0, 255], [255, 165, 0],
        [0, 255, 255], [128, 128, 0], [127, 127, 127],
        [0, 128, 128], [255, 20, 147], [255, 215, 0],
        [75, 0, 130], [255, 105, 180], [173, 216, 230],
        [0, 128, 0], [139, 69, 19], [0, 0, 0], [192, 192, 192]
    ]
    target_colors = np.array(target_colors_data, dtype=np.int32)  # Use int32 to handle larger values without overflow

    # Calculate distances and find the closest target color for each pixel
    distances = distance_equation(target_colors, input_array)
    indices = np.argmin(distances, axis=0)

    # Create an output tensor with 19 channels, each being a mask for one target color
    H, W = indices.shape
    output_tensor = torch.zeros((19, H, W), dtype=torch.uint8)

    for i in range(19):
        output_tensor[i] = torch.tensor(indices == i, dtype=torch.uint8)

    return output_tensor

def assign_class_colors(input_array):
    # Make sure the input array is a numpy array of type np.uint8
    if not isinstance(input_array, np.ndarray) or input_array.dtype != np.uint8:
        raise ValueError("Input array must be a numpy array with dtype np.uint8")

    # Define the target colors as uint8
    target_colors_data = [
        [255, 255, 255], [128, 0, 128], [255, 0, 0],
        [0, 255, 0], [0, 0, 255], [255, 165, 0],
        [0, 255, 255], [128, 128, 0], [127, 127, 127],
        [0, 128, 128], [255, 20, 147], [255, 215, 0],
        [75, 0, 130], [255, 105, 180], [173, 216, 230],
        [0, 128, 0], [139, 69, 19], [0, 0, 0], [192, 192, 192]
    ]
    target_colors = np.array(target_colors_data, dtype=np.uint8)  # Use np.uint8 directly

    # Calculate distances and find the closest target color for each pixel
    distances = distance_equation(target_colors, input_array)
    indices = np.argmin(distances, axis=0)
    output_array = target_colors[indices]

    # Convert the output array back to a PyTorch tensor
    output_tensor = torch.tensor(output_array, dtype=torch.uint8).permute(2, 0, 1)  # Convert to [C, H, W]
    if output_tensor.dtype != torch.uint8:
        print("Warning: Output tensor data type is not torch.uint8. It is:", output_tensor.dtype)
        output_tensor = output_tensor.to(torch.uint8)

    return output_tensor

def GetFaceParsingModel(model_type: FaceParsingModelType = FaceParsingModelType.F256_FACE_PARSING, which_epoch='latest'):
    print("Model type received:", model_type)
    print("Initializing Face Parsing model")
    
    if model_type == FaceParsingModelType.F256_FACE_PARSING:
        print("F256_FACE_PARSING ")
        options = FaceParsingOptions('F256_Face_Parsing').parse(save=False)
    elif model_type == FaceParsingModelType.D256_LE_2_FACE_PARSING:
        print("D256_LE_2_FACE_PARSING ")
        options = FaceParsingOptions('D256_LE_2_Face_Parsing', 2, which_epoch).parse(save=False)
    elif model_type == FaceParsingModelType.D128_FACE_PARSING:
        print("D128_FACE_PARSING ")
        options = FaceParsingOptions('D128_Face_Parsing').parse(save=False)
    elif model_type == FaceParsingModelType.G128_FACE_PARSING:
        print("G128_FACE_PARSING")
        options = FaceParsingOptions('G128_Face_Parsing', 1, which_epoch, 512, 512).parse(save=False)
    elif model_type == FaceParsingModelType.SUPER_FACE_PARSING:
        print("FaceParsingModelType.SUPER_FACE_PARSING")
        options = FaceParsingOptions('Super_Face_Parsing', 4, which_epoch, 512, 256, 128).parse(save=False)
    elif model_type == FaceParsingModelType.Enhanced_Face_Parsing:
        print("FaceParsingModelType.Enhanced_Face_Parsing")
        options = Enhanced_Face_Parsing(which_epoch).parse(save=False)

 
    print("create_model(options)")
    FaceParser = create_model(options)
    is_face_model_loaded = True
    return FaceParser

def display_face_segmentation(segmentation_mask):
    if segmentation_mask.dim() != 2:
        raise ValueError("The segmentation mask should be a 2D tensor")

    plt.figure(figsize=(10, 10))
    plt.imshow(segmentation_mask.cpu(), cmap='gray')  # Ensure tensor is on CPU and display as grayscale
    plt.colorbar()  # Optionally add a colorbar to see the mask values
    plt.axis('off')  # Hide axis for better visualization
    plt.show()

def display_eye_segmentation(left_eye_segment, right_eye_segment):
    fig, axes = plt.subplots(3, 2, figsize=(10, 15))

    labels = ['Iris', 'Left of Iris', 'Right of Iris']

    for i in range(3):
        axes[i, 0].imshow(left_eye_segment[i].cpu(), cmap='gray')
        axes[i, 0].set_title(f'Left Eye - {labels[i]}')
        axes[i, 0].axis('off')
        axes[i, 1].imshow(right_eye_segment[i].cpu(), cmap='gray')
        axes[i, 1].set_title(f'Right Eye - {labels[i]}')
        axes[i, 1].axis('off')

    plt.tight_layout()
    plt.show()

def Faceless_1_Options():
    face_options = FFO.FlatFaceOption()
    face_options.head_face_color = '#fddeca'
    face_options.hair_color = '#834e24'
    face_options.upper_lip_color =  None
    face_options.lower_lip_color =  None
    face_options.neck_shadow_color =  None
    face_options.neck_color = '#fddeca'
    face_options.background_color = '#191c49'
    face_options.eyebrow_color = '#834e24'
    face_options.cloth_color = 'cb8c56'
    face_options.hat_color = None
    face_options.glasses_color = '#000000'
    face_options.mouth_color = None
    face_options.linecolor = '#000000'
    face_options.eye_color = None
    face_options.necklace_color = None
    return face_options

def Tenshi_Options():
    face_options = FFO.FlatFaceOption()
    face_options.head_face_color = '#fee3ce'
    face_options.hair_color = 'f0f0ee'
    face_options.upper_lip_color = '#ec59a7'
    face_options.lower_lip_color = '#7a2c53'
    face_options.neck_shadow_color = '#dba173'
    face_options.neck_color = '#fee3ce'
    face_options.background_color = '#FFFFFF'
    face_options.eyebrow_color = '#B2BFC8'
    face_options.cloth_color = '#1b387a'
    face_options.hat_color = '#3b393a'
    face_options.glasses_color = '#1B5F53'
    face_options.mouth_color = '#000000'
    face_options.linecolor = '#000000'
    face_options.eye_color = '#FDFDFB'
    face_options.necklace_color = '#E7E264'
    return face_options

def TenshiAbstract_Options():
    face_options = FFO.FlatFaceOption()
    face_options.head_face_color = '#fee3ce'
    face_options.hair_color = 'f0f0ee'
    face_options.upper_lip_color = '#ec59a7'
    face_options.lower_lip_color = '#7a2c53'
    face_options.neck_shadow_color = '#dba173'
    face_options.neck_color = '#fee3ce'
    face_options.background_color = '#FFFFFF'
    face_options.eyebrow_color = '#B2BFC8'
    face_options.cloth_color = '#1b387a'
    face_options.hat_color = '#3b393a'
    face_options.glasses_color = '#1B5F53'
    face_options.mouth_color = '#000000'
    face_options.linecolor = '#000000'
    face_options.eye_color = '#FDFDFB'
    face_options.necklace_color = '#E7E264'
    face_options.epsilon_factor = 0.02
    return face_options

def Line_Work_Options():
    face_options = FFO.FlatFaceOption()
    face_options.hair_color = '#FFFFFF'  
    face_options.head_face_color = '#FFFFFF' 
    face_options.eyebrow_color = '#FFFFFF' 
    face_options.background_color = '#FFFFFF' 
    face_options.hat_color = '#FFFFFF'
    face_options.cloth_color = '#FFFFFF'
    face_options.neck_shadow_color = '#FFFFFF'
    face_options.glasses_color = '#FFFFFF'
    face_options.linecolor = '#000000'
    face_options.neck_color = '#FFFFFF'
    face_options.upper_lip_color = '#FFFFFF' 
    face_options.lower_lip_color = '#FFFFFF'
    face_options.mouth_color = '#FFFFFF'
    face_options.eye_color = '#FFFFFF'
    face_options.necklace_color = '#FFFFFF'
    face_options.stroke_thickness=10
    face_options.epsilon_factor = 0.001
    return face_options

def abstract_face_lines_options():
    face_options = FFO.FlatFaceOption()
    face_options.hair_color = '#FFFFFF'  
    face_options.head_face_color = '#FFFFFF' 
    face_options.eyebrow_color = '#FFFFFF' 
    face_options.background_color = '#FFFFFF' 
    face_options.hat_color = '#FFFFFF'
    face_options.cloth_color = '#FFFFFF'
    face_options.neck_shadow_color = '#FFFFFF'
    face_options.glasses_color = '#FFFFFF'
    face_options.linecolor = '#000000'
    face_options.neck_color = '#FFFFFF'
    face_options.upper_lip_color = '#FFFFFF' 
    face_options.lower_lip_color = '#FFFFFF'
    face_options.mouth_color = '#FFFFFF'
    face_options.eye_color = '#FFFFFF'
    face_options.necklace_color = '#FFFFFF'
    face_options.stroke_thickness=4
    face_options.epsilon_factor = 0.02
    return face_options

def CrimsonCanvas_Options():
    face_options = FFO.FlatFaceOption()
    face_options.head_face_color = '#eecdbf'
    face_options.hair_color = '#781005'
    face_options.upper_lip_color = '#ec59a7'
    face_options.lower_lip_color = '#7a2c53'
    face_options.neck_shadow_color = '#cd9d94'
    face_options.neck_color = '#eecdbf'
    face_options.background_color = '#3E3D3D'
    face_options.eyebrow_color = '#781005'
    face_options.cloth_color = '#1b387a'
    face_options.hat_color = '#3b393a'
    face_options.glasses_color = '#1B5F53'
    face_options.mouth_color = '#000000'
    face_options.linecolor = '#000000'
    face_options.eye_color = '#FDFDFB'
    face_options.necklace_color = '#E7E264'
    face_options.add_drop_shadow = True
    return face_options

def abstract_RedHaired_Options():
    face_options = FFO.FlatFaceOption()
    face_options.head_face_color = '#eecdbf'
    face_options.hair_color = '#781005'
    face_options.upper_lip_color = '#ec59a7'
    face_options.lower_lip_color = '#7a2c53'
    face_options.neck_shadow_color = '#cd9d94'
    face_options.neck_color = '#eecdbf'
    face_options.background_color = '#3E3D3D'
    face_options.eyebrow_color = '#781005'
    face_options.cloth_color = '#1b387a'
    face_options.hat_color = '#3b393a'
    face_options.glasses_color = '#1B5F53'
    face_options.mouth_color = '#000000'
    face_options.linecolor = '#000000'
    face_options.eye_color = '#FDFDFB'
    face_options.necklace_color = '#E7E264'
    face_options.add_drop_shadow = True
    face_options.epsilon_factor = 0.02
    face_options.stroke_thickness=10
    face_options.opacity = 10
    return face_options

def ScarletFrame_Options():
    face_options = FFO.FlatFaceOption()
    face_options.head_face_color = '#eecdbf'
    face_options.hair_color = '#781005'
    face_options.upper_lip_color = '#cd9d94'
    face_options.lower_lip_color = '#cd9d94'
    face_options.neck_shadow_color = '#cd9d94'
    face_options.neck_color = '#eecdbf'
    face_options.background_color = '#3E3D3D'
    face_options.eyebrow_color = '#781005'
    face_options.cloth_color = '#304636'
    face_options.hat_color = '#3b393a'
    face_options.glasses_color = '#1B5F53'
    face_options.mouth_color = '#220602'
    face_options.linecolor = '#000000'
    face_options.eye_color = '#FDFDFB'
    face_options.necklace_color = '#E7E264'
    face_options.stroke_thickness=10
    face_options.opacity = 10
    return face_options

def BlueShade_Options():
    face_options = FFO.FlatFaceOption()
    base_color = '#3A5F7D'  # A soothing, deep blue shade

    # Using different shades of the base color for various parts
    face_options.head_face_color = '#4A6F8D'  # Slightly lighter than base
    face_options.hair_color = '#2A4F6D'  # Darker, adding depth
    face_options.upper_lip_color = '#47677C'
    face_options.lower_lip_color = '#405B70'
    face_options.neck_shadow_color = '#365A6D'  # Shadow effect
    face_options.neck_color = '#4A6F8D'
    face_options.background_color = '#2E4053'  # Very dark blue for contrast
    face_options.eyebrow_color = '#2A4F6D'
    face_options.cloth_color = '#527BA0'  # A brighter, more vibrant blue
    face_options.hat_color = '#3A5F7D'
    face_options.glasses_color = '#FDFDFB'  
    face_options.mouth_color = '#36495A'
    face_options.linecolor = '#213E55'
    face_options.eye_color = '#FDFDFB'  # Keeping the eyes lighter for contrast
    face_options.necklace_color = '#E7E264'  # Adding a pop of contrasting color
    face_options.add_drop_shadow = True
    face_options.drop_shadow_color = '#1D2B36'  # Deep blue shadow for depth
    face_options.x_offset = 150
    face_options.y_offset = 0
    face_options.opacity = 40

    return face_options

def TriadicGlow_Options():
    face_options = FFO.FlatFaceOption()
    
    # Base colors - choosing a triadic color scheme based on a primary color of deep blue-green
    base_color1 = '#006064'  # Cyan-like deep blue-green
    base_color2 = '#F4511E'  # A complementary deep orange
    base_color3 = '#1B5E20'  # Dark green
    
    # Applying colors to the face features
    face_options.head_face_color = base_color1  # Primary color for the face
    face_options.hair_color = base_color2  # Complementary color for hair
    face_options.upper_lip_color = base_color1
    face_options.lower_lip_color = base_color1
    face_options.neck_shadow_color = base_color1
    face_options.neck_color = base_color1
    face_options.background_color = '#B2DFDB'  # Soft cyan background for contrast
    face_options.eyebrow_color = base_color2
    face_options.cloth_color = base_color3  # Another complementary color for clothing
    face_options.hat_color = base_color2
    face_options.eye_color = base_color2  # Distinctive eye color
    face_options.glasses_color = base_color2  # Glasses same as eyes for harmony
    face_options.mouth_color = base_color3
    face_options.linecolor = '#004D40'  # A darker shade of the primary color
    face_options.necklace_color = '#FFAB40'  # A bright accent color for the necklace
    face_options.add_drop_shadow = True
    face_options.drop_shadow_color = '#263238'  # Very dark shade for depth
    face_options.x_offset = 150
    face_options.y_offset = 0
    face_options.opacity = 40

    return face_options

def DarkColorBlend_Options():
    skin_color = '#BEA499'
    face_options = FFO.FlatFaceOption()
    face_options.head_face_color = skin_color
    face_options.hair_color = '#781005'
    face_options.upper_lip_color = '#ec59a7'
    face_options.lower_lip_color = '#7a2c53'
    face_options.neck_shadow_color = '#7A6962'
    face_options.neck_color = skin_color
    face_options.background_color = '#FFFFFF'
    face_options.eyebrow_color = '#781005'
    face_options.cloth_color = '#304636'
    face_options.hat_color = '716F7B'
    face_options.glasses_color = '#0F0E0D'
    face_options.mouth_color = '#220602'
    face_options.linecolor = '#000000'
    face_options.eye_color = '#FDFDFB'
    face_options.necklace_color = '#E7E264'
    return face_options

def TriadicVision_Options():
    face_options = FFO.FlatFaceOption()
    
    # Base colors for triadic harmony
    primary_blue = '#0000FF'  # Vivid Blue
    vivid_red = '#FF0000'     # Vivid Red
    bright_yellow = '#FFFF00' # Bright Yellow
    
    # Applying triadic colors to the face features
    face_options.head_face_color = primary_blue  # Primary color for the face
    face_options.hair_color = vivid_red          # Complementary color for hair
    face_options.upper_lip_color = bright_yellow
    face_options.lower_lip_color = bright_yellow
    face_options.neck_shadow_color = primary_blue
    face_options.neck_color = primary_blue
    face_options.background_color = '#FFFFFF'    # White background for contrast
    face_options.eyebrow_color = vivid_red
    face_options.cloth_color = bright_yellow     # Another complementary color for clothing
    face_options.hat_color = vivid_red
    face_options.eye_color = primary_blue        # Distinctive eye color
    face_options.glasses_color = primary_blue    # Glasses same as eyes for harmony
    face_options.mouth_color = vivid_red
    face_options.linecolor = primary_blue        # Blue line color
    face_options.necklace_color = '#FFD700'      # Gold color for the necklace, adding a bit of sparkle
    face_options.add_drop_shadow = True
    face_options.drop_shadow_color = '#333333'   # Dark grey for depth
    face_options.x_offset = 150
    face_options.y_offset = 0
    face_options.opacity = 40

    return face_options

def TriadShade_Options():
    face_options = FFO.FlatFaceOption()
    
    # Base colors for triadic harmony
    teal = '#008080'  # A deep teal
    maroon = '#800000'  # A rich maroon
    gold = '#FFD700'  # A bright gold
    
    # Applying triadic colors to the face features
    face_options.head_face_color = teal  # Primary color for the face
    face_options.hair_color = maroon     # Complementary color for hair
    face_options.upper_lip_color = gold
    face_options.lower_lip_color = gold
    face_options.neck_shadow_color = teal
    face_options.neck_color = teal
    face_options.background_color = '#F0EAD6'  # Beige background for soft contrast
    face_options.eyebrow_color = maroon
    face_options.cloth_color = gold           # Bright clothing to stand out
    face_options.hat_color = teal
    face_options.eye_color = maroon           # Eyes that match the hair for consistency
    face_options.glasses_color = maroon       # Glasses same as eyes for harmony
    face_options.mouth_color = teal
    face_options.linecolor = maroon           # Maroon line color for an elegant look
    face_options.necklace_color = gold        # Gold necklace to complement the other accessories
    face_options.add_drop_shadow = True
    face_options.drop_shadow_color = '#404040'  # Dark grey for depth
    face_options.x_offset = 150
    face_options.y_offset = 0
    face_options.opacity = 40

    return face_options

def Supreme_Kai_Faces_Options():
    face_options = FFO.FlatFaceOption()
    face_options.head_face_color = '#E5F3FE'
    face_options.hair_color = '#EFF1F0'
    face_options.upper_lip_color = '#A256EE'
    face_options.lower_lip_color = '#532C7A'
    face_options.neck_shadow_color = '#89BEF8'
    face_options.neck_color = '#E5F3FE'
    face_options.background_color = '#FFFFFF'
    face_options.eyebrow_color = '#B2BFC8'
    face_options.cloth_color = '#7A381A'
    face_options.hat_color = '#39393B'
    face_options.glasses_color = '#1B5F53'
    face_options.mouth_color = '#000000'
    face_options.linecolor = '#000000'
    face_options.eye_color = '#FDFDFB'
    face_options.necklace_color = '#E7E264'
    face_options.add_drop_shadow = True
    face_options.drop_shadow_color = '#000000'   #black
    face_options.x_offset = 150
    face_options.y_offset = 0
    face_options.opacity = 25
    return face_options

def apply_median_blur(tensor, ksize=7):
    """
    Apply a median blur to each channel in the tensor separately.
    
    Parameters:
        tensor (torch.Tensor): The input tensor with shape [C, H, W].
        ksize (int): The size of the kernel to be used for the median blur.
    
    Returns:
        torch.Tensor: The processed tensor with median blur applied to each channel.
    """
    if tensor.dim() != 3:
        raise ValueError("Tensor must be 3-dimensional [C, H, W]")

    tensor_np = tensor.cpu().numpy()
    processed_tensor_np = np.zeros_like(tensor_np, dtype=np.uint8)

    for i in range(tensor_np.shape[0]):
        mask = tensor_np[i]
        blurred_mask = cv2.medianBlur(mask, ksize)
        processed_tensor_np[i] = blurred_mask

    processed_tensor = torch.from_numpy(processed_tensor_np).type(torch.uint8)
    return processed_tensor

def segmentation_map_postprocessing(generated_image_tensor,  normalize=False):
    generated_image = tensor2im(generated_image_tensor,  normalize)
    color_masks_tensor = create_color_masks(generated_image)
    shapes_tensor = remove_small_objects(color_masks_tensor, 200, 5)
    shapes_tensor = apply_median_blur(shapes_tensor)
    return shapes_tensor

def visualize_image(image, title="Image"):
    plt.figure(figsize=(6,6))
    plt.imshow(image, interpolation='nearest')
    plt.title(title)
    plt.show()

def visualize_image_one_Channel(image, title="Image", cmap='gray'):
    plt.figure(figsize=(6,6))
    plt.imshow(image, cmap=cmap, interpolation='nearest')
    plt.title(title)
    plt.show()
    
def apply_mask(input_image_tensor, one_channel_mask):
    # Ensure input_image_tensor is a numpy array with correct shape (1024, 1024, 3)
    if isinstance(input_image_tensor, torch.Tensor):
        input_image_tensor = input_image_tensor.cpu().numpy()
        input_image_tensor = np.transpose(input_image_tensor, (1, 2, 0))  # CHW to HWC

    # Convert one_channel_mask to a 3-channel mask by repeating it across the channel dimension
    three_channel_mask = np.stack([one_channel_mask]*3, axis=-1)

    # Apply the mask: Set pixels to white (255, 255, 255) where mask is black (0)
    output_image = np.where(three_channel_mask == 0, [255, 255, 255], input_image_tensor)

    return output_image

def get_eye_mask(left_eye_ndarray, right_eye_ndarray):
    # Create a full black canvas in single-channel
    mask_canvas = np.zeros((1024, 1024), dtype=np.uint8)

    # Apply the left eye mask
    #This sets the eye regions to 255 where the mask is 255"
    mask_canvas = np.where(left_eye_ndarray == 255, 255, mask_canvas)

    # Apply the right eye mask
    #This also sets the eye regions to 255, combining both masks"
    mask_canvas = np.where(right_eye_ndarray == 255, 255, mask_canvas)

    return mask_canvas

def segment_eyes(left_eye_ndarray, right_eye_ndarray, input_image_tensor):
    left_eye_ndarray = cv2.resize(left_eye_ndarray.astype(np.uint8), (1024, 1024), interpolation=cv2.INTER_NEAREST)
    right_eye_ndarray = cv2.resize(right_eye_ndarray.astype(np.uint8), (1024, 1024), interpolation=cv2.INTER_NEAREST)
    mask_canvas = get_eye_mask(left_eye_ndarray, right_eye_ndarray)
    # Apply the mask to the input image
    eyes_image = apply_mask(input_image_tensor, mask_canvas)
    return eyes_image

def get_eyes_only_images(source_folder, destination_folder, model_type: FaceParsingModelType = FaceParsingModelType.F256_FACE_PARSING, which_epoch = 'latest'):
     FaceParser = GetFaceParsingModel(model_type, which_epoch)
     image_saver = ImageSaver(destination_folder)
     print("Creating a list of images to process")
     image_paths = os.listdir(source_folder)
     loop = tqdm(image_paths, leave=True)
     for image_name in loop:
         try:
             with torch.no_grad():  # Disable gradient computation
                image_path = os.path.join(source_folder, image_name)
                input_image_tensor = p2pUtil.get_image_of_model(image_path, img_height, img_width)
                original_image_tensor = p2pUtil.get_original_image(image_path)
                inst_temp = torch.zeros((1,), dtype=torch.long)
                image_temp = torch.zeros((1,), dtype=torch.long)
                generated_image_tensor = FaceParser.inference(input_image_tensor, inst_temp, image_temp)
                shapes_tensor = segmentation_map_postprocessing(generated_image_tensor, True)
                segmented_face_tensor = shapes_tensor.cpu().numpy()
                left_eye = segmented_face_tensor[face_segment_indices['l_eye']]
                right_eye = segmented_face_tensor[face_segment_indices['r_eye']]                
                eye_image = segment_eyes(left_eye,right_eye, original_image_tensor )
                #visualize_image(eye_image)
                image_saver.save_image(image_name, eye_image)
         except Exception as e:
             print(f"Failed to process {image_name}: {e}")

def get_FaceParsing_image(img):
    global is_face_model_loaded
    global FaceParser
    
    if use_default_face_model:
        which_epoch, model_type = default_face_model()
    else:
        which_epoch = 281
        model_type = FaceParsingModelType.Enhanced_Face_Parsing

    if not is_face_model_loaded:
        FaceParser = GetFaceParsingModel(model_type, which_epoch)
        is_face_model_loaded = True
    processor_images = InferenceImageProcessor(img_height, img_width)
    input_image_tensor = processor_images.process_face_image_Non_AI(img)
    with torch.no_grad():
        inst_temp = torch.zeros((1,), dtype=torch.long)
        image_temp = torch.zeros((1,), dtype=torch.long)
        generated_image_tensor = FaceParser.inference(input_image_tensor, inst_temp, image_temp)
    return generated_image_tensor

def Generate_Face_Drawing(img, face_drawing_style, is_dotted=False, gap_width=12, segment_width=12, lineless=False, Faceless=False, crazy_neck = False):
    digital_face_art = FA.FaceArt(set_FaceParser_style(face_drawing_style))
    save_debug_image(img, "input_to_generate_face_drawing")
    with torch.no_grad():
        generated_image_tensor = Diff.FaceParsing_T2(img)

    shapes_tensor = segmentation_map_postprocessing(generated_image_tensor)
    segmented_face_tensor = shapes_tensor.cpu().numpy()
    if(crazy_neck):
        segmented_face_tensor[face_segment_indices['neck']] = fit_neck_shape(segmented_face_tensor[face_segment_indices['neck']])

    if Faceless:
        digital_face_art_tensor = digital_face_art.Create_Faceless_drawing(segmented_face_tensor)
    elif is_dotted:
        digital_face_art_tensor = digital_face_art.create_line_face_drawing(segmented_face_tensor, gap_width, segment_width)
    else:
        digital_face_art_tensor = digital_face_art.create_artistic_face_drawing(segmented_face_tensor, True, lineless)
        
    return cv2.cvtColor(digital_face_art_tensor, cv2.COLOR_BGR2RGB)

def Generate_Single_FaceArt_image(img, face_options, model_type,  which_epoch  = 'latest',  is_dotted = False, gap_width=12, segment_width=12, lineless = False, Faceless = False, crazy_neck = False):
    FaceParser = GetFaceParsingModel(model_type, which_epoch)
    digital_face_art =  FA.FaceArt(face_options)
    input_image_tensor = p2pUtil.process_image_for_model(img, img_width, img_height)
    inst_temp = torch.zeros((1,), dtype=torch.long)
    image_temp = torch.zeros((1,), dtype=torch.long)
    generated_image_tensor = FaceParser.inference(input_image_tensor , inst_temp, image_temp)
    shapes_tensor = segmentation_map_postprocessing(generated_image_tensor, True)
    segmented_face_tensor = shapes_tensor.cpu().numpy()
                    
    if(crazy_neck):
        segmented_face_tensor[face_segment_indices['neck']] = fit_neck_shape(segmented_face_tensor[face_segment_indices['neck']])
    if Faceless:
        digital_face_art_tensor = digital_face_art.Create_Faceless_drawing(segmented_face_tensor)
    elif is_dotted :
        digital_face_art_tensor = digital_face_art.create_line_face_drawing(segmented_face_tensor, gap_width, segment_width)
    else:
        digital_face_art_tensor = digital_face_art.create_artistic_face_drawing(segmented_face_tensor, True, lineless)
    return digital_face_art_tensor

def Make_Faces_Drawing(face_options, model_type,  source_folder, destination_folder, which_epoch  = 'latest',  is_dotted = False, gap_width=12, segment_width=12, lineless = False, Faceless = False, crazy_neck = False):
    FaceParser = GetFaceParsingModel(model_type, which_epoch)
    digital_face_art =  FA.FaceArt(face_options)
    image_saver = ImageSaver(destination_folder)
    print("Creating a list of images to process")
    image_paths = os.listdir(source_folder)
    loop = tqdm(image_paths, leave=True)
    for image_name in loop:
        try:
            if image_name.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')):
                with torch.no_grad():  # Disable gradient computation
                    image_path = os.path.join(source_folder, image_name)
                    input_image_tensor = p2pUtil.get_image_of_model(image_path, img_width, img_height)
                    inst_temp = torch.zeros((1,), dtype=torch.long)
                    image_temp = torch.zeros((1,), dtype=torch.long)
                    generated_image_tensor = FaceParser.inference(input_image_tensor, inst_temp, image_temp)
                    shapes_tensor = segmentation_map_postprocessing(generated_image_tensor, True)
                    segmented_face_tensor = shapes_tensor.cpu().numpy()
                    
                    if(crazy_neck):
                        segmented_face_tensor[face_segment_indices['neck']] = fit_neck_shape(segmented_face_tensor[face_segment_indices['neck']])
                    
                    if Faceless:
                        digital_face_art_tensor = digital_face_art.Create_Faceless_drawing(segmented_face_tensor)
                    elif is_dotted :
                        digital_face_art_tensor = digital_face_art.create_line_face_drawing(segmented_face_tensor, gap_width, segment_width)
                    else:
                        digital_face_art_tensor = digital_face_art.create_artistic_face_drawing(segmented_face_tensor, True, lineless)
                    
                    if(digital_face_art_tensor is not None ):
                        image_saver.save_drawing(image_name, digital_face_art_tensor)
        except Exception as e:
            print(f"Failed to process {image_name}: {e}")
   
def comparison_test(test_set1_directory, test_set2_directory, destination_folder):
    # Process test set 1
    destination_subfolder = os.path.join(destination_folder, "Test_A")
    Make_Faces_Drawing(test_set1_directory, destination_subfolder)

    destination_subfolder = os.path.join(destination_folder, "Test_B")
    Make_Faces_Drawing(test_set2_directory, destination_subfolder)

def set_FaceParser_style(face_drawing_style):
    # Build function name from enum
    func_name = face_drawing_style.name + '_Options'

    # Fetch the function by name from the global scope
    options_func = globals().get(func_name)

    if options_func:
        return options_func()  # Call the function if it exists
    else:
        raise ValueError(f"No options function found for style {face_drawing_style.name}")

def refine_neck_mask(neck_mask, max_dilate=10):
    """
    Refine the neck mask using morphological operations, but limit the dilation size to prevent the neck from growing too large.
    """
    # Convert mask to binary if it's not already
    neck_mask_binary = (neck_mask > 0).astype(np.uint8)
    
    # Define the structuring element for opening
    selem = square(5)  # Adjust the size if necessary
    
    # Apply morphological opening to remove noise
    refined_mask = opening(neck_mask_binary, selem)
    
    # Optional step: limit the dilation if needed to control neck size
    dilated_mask = cv2.dilate(refined_mask, np.ones((3, 3), np.uint8), iterations=max_dilate)
    
    return dilated_mask.astype(np.uint8) * 255  # Convert back to original format

def clean_neck_contours(neck_mask, min_area=30, max_area_ratio=0.3):
    """
    Clean up the neck contours, ensure the neck doesn't exceed a maximum allowed area, 
    and ensure only one connected component (blob) is retained (the largest one).
    """
    # Find contours
    contours, _ = cv2.findContours(neck_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter out contours smaller than min_area
    large_contours = [cnt for cnt in contours if cv2.contourArea(cnt) > min_area]
    
    # Check if the largest contour is too big
    image_area = neck_mask.shape[0] * neck_mask.shape[1]
    large_contours = [cnt for cnt in large_contours if cv2.contourArea(cnt) < image_area * max_area_ratio]
    
    # If multiple large contours exist, retain only the largest one (blob detection)
    if len(large_contours) > 1:
        # Sort contours by area and keep only the largest one
        largest_contour = max(large_contours, key=cv2.contourArea)
        large_contours = [largest_contour]  # Keep only the largest blob
    
    # Create a new mask with only the largest contour (blob)
    clean_mask = np.zeros_like(neck_mask)
    cv2.drawContours(clean_mask, large_contours, -1, (255), thickness=cv2.FILLED)
    
    return clean_mask

def force_ellipse_shape(ellipse):
    """
    Ensure the ellipse remains reasonably shaped by enforcing a width-to-height ratio.
    """
    # Calculate the width and height of the ellipse
    width, height = ellipse[1]
    
    # Enforce a width-to-height ratio constraint (e.g., 1:2 or 2:1)
    ratio = width / height if width > height else height / width
    if ratio > 2:  # Arbitrary ratio limit, can be adjusted based on requirements
        if width > height:
            width = height * 2
        else:
            height = width * 2
    
    return (ellipse[0], (width, height), ellipse[2])  # Return adjusted ellipse

def fit_ellipse_to_neck(neck_mask, max_ellipse_size=500):
    """
    Fit an ellipse to the neck, ensuring the neck stays within its original position and the ellipse does not exceed a maximum size.
    """
    contours, _ = cv2.findContours(neck_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        # Find the largest contour
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Fit an ellipse to the largest contour if it's large enough
        if len(largest_contour) >= 5:  # FitEllipse requires at least 5 points
            ellipse = cv2.fitEllipse(largest_contour)
            
            # Ensure the ellipse size is not too big and force a reasonable ellipse shape
            ellipse = force_ellipse_shape(ellipse)
            
            # Get the original centroid of the largest contour
            M = cv2.moments(largest_contour)
            if M["m00"] != 0:
                original_centroid = (int(M["m10"] / M["m00"]), int(M["m01"] / M["m00"]))
            else:
                original_centroid = ellipse[0]  # fallback to ellipse center
            
            # Adjust the ellipse to be centered on the original centroid
            adjusted_ellipse = ((original_centroid[0], original_centroid[1]), ellipse[1], ellipse[2])
            
            # Create a mask with the new ellipse
            ellipse_mask = np.zeros_like(neck_mask)
            cv2.ellipse(ellipse_mask, adjusted_ellipse, (255), -1)
            return ellipse_mask
    return neck_mask  # Return the original mask if no valid ellipse is found

def fit_neck_shape(neck_mask):
    """
    Refine the neck shape through various stages: morphological opening, contour cleaning, and ellipse fitting.
    """
    # Step 1: Refine the mask using controlled morphological operations
    refined_mask = refine_neck_mask(neck_mask)
    
    # Step 2: Clean up the contours while ensuring the neck stays within a reasonable size
    cleaned_mask = clean_neck_contours(refined_mask)
    
    # Step 3: Fit an ellipse to the neck, ensuring the ellipse is not excessively large and remains properly shaped
    final_mask = fit_ellipse_to_neck(cleaned_mask)
    
    return final_mask

def run_face_parsing_model(which_epoch, model_type, line_soomer, is_dotted, gap_width, segment_width, face_drawing_style, lineless, Faceless, add_drop_shadow, offsizes = False, crazy_neck = False):
    base_folder = r"G:\My Drive\All_Deep_Learning_Models\AI Model Image Examples\New_Cartoon_Tests"
    
    FaceParser = set_FaceParser_style(face_drawing_style)
    FaceParser.epsilon_factor = line_soomer
    #FaceParser.stroke_thickness = 1

    if Faceless:
        destination_folder = f"{face_drawing_style.name}_Faceless_Face_epoch({which_epoch})"
    elif lineless and add_drop_shadow:
         destination_folder = f"{face_drawing_style.name}_Lineless_Face_with_Drop_Shadow_epoch({which_epoch})"
         FaceParser.add_drop_shadow = True
    elif lineless:
        destination_folder = f"{face_drawing_style.name}_Lineless_Face_epoch({which_epoch})"
    elif add_drop_shadow:
        destination_folder = f"{face_drawing_style.name}_Face_with_Drop_Shadow_epoch({which_epoch})"
        FaceParser.add_drop_shadow = True
    elif line_soomer:
        destination_folder = f"{face_drawing_style.name}_Line_Soomer_Face_epoch({which_epoch})"
    elif is_dotted:
        destination_folder = f"{face_drawing_style.name}_Dotted_Line_Face_epoch({which_epoch})_gapwidth_{gap_width}_segmentwidth_{segment_width}"
    else:
        destination_folder = f"{face_drawing_style.name}_epoch({which_epoch})"
    
    destination_folder = rf"{base_folder}\{destination_folder}"
    
    test_images = r'TestImages'
    if offsizes:
        test_images = r'Test_OutPut'
        destination_folder = destination_folder + "_offsize_Images"  

    Make_Faces_Drawing(FaceParser, model_type, test_images, destination_folder, which_epoch, is_dotted, gap_width, segment_width, lineless, Faceless, crazy_neck)

def default_face_model():
    return 56, FaceParsingModelType.D256_LE_2_FACE_PARSING

def broken_glass(img):
    ai_model_name = 'Face_Parsing_1024X1024'
    which_epoch= 10
    ngf = 64
    chalk_board = afm.apply_filter_to_image(img, ai_model_name)
    return chalk_board

def Get_Face_Drawing(img, face_drawing_style, crazy_neck=False, lineless=False, is_dotted=False, gap_width=12, segment_width=6, Faceless=False):
    if use_default_face_model:
        which_epoch, model_type = default_face_model()
    else:
        which_epoch = 281
        model_type = FaceParsingModelType.Enhanced_Face_Parsing
    
    FaceParser = set_FaceParser_style(face_drawing_style)
    generated_image = Generate_Single_FaceArt_image(img, FaceParser, model_type, which_epoch, is_dotted, gap_width, segment_width, lineless, Faceless, crazy_neck)
    generated_image_rgb = cv2.cvtColor(generated_image, cv2.COLOR_BGR2RGB)
    return generated_image_rgb

def run_get_eyes_only_images(which_epoch, model_type: FaceParsingModelType = FaceParsingModelType.F256_FACE_PARSING):
    test_images = r'TestImages'
    base_folder = r"G:\My Drive\All_Deep_Learning_Models\AI Model Image Examples\Cartoon_Drawings\Cartoon Drawing Style Tests"
    destination_folder = f"{face_drawing_styles.name}_EyesOnly_epoch({which_epoch})"
    destination_folder = rf"{base_folder}\{destination_folder}"
    get_eyes_only_images(test_images, destination_folder, model_type, which_epoch)

if __name__ == "__main__": 
    print("Running as script")
    which_epoch = 42 
    line_soomer =  0.001
    crazy_neck = False
    is_dotted = False
    lineless = False
    Faceless = False
    add_drop_shadow = True
    offsizes = False
    gap_width = 12
    segment_width = 6
    face_drawing_styles = FaceDrawingTypes.Tenshi
    model_type = FaceParsingModelType.D256_LE_2_FACE_PARSING
    run_face_parsing_model(which_epoch, model_type, line_soomer, is_dotted, gap_width, segment_width, face_drawing_styles, lineless, Faceless, add_drop_shadow, offsizes, crazy_neck)
    #run_get_eyes_only_images(which_epoch, model_type)


def save_debug_image(img, step_name, img_name="debug_image"):
    debug_folder = "./Debug_Images"
    os.makedirs(debug_folder, exist_ok=True)
    img_path = os.path.join(debug_folder, f"{img_name}_{step_name}.png")
    img.save(img_path)
    print(f"Image saved at: {img_path}")