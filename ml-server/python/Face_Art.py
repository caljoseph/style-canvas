import cv2
import numpy as np
from skimage import morphology, measure
import face_segment_indices as FSI
from draw_contour import DrawContour
import matplotlib.pyplot as plt

def clean_mask(mask_np, min_size=300):
    """
    Clean a binary mask by removing small holes, closing gaps, and retaining the largest connected component.
    
    Parameters:
        mask_np (numpy.ndarray): The input binary mask with shape [H, W], where pixels are either 0 or 255.
        min_size (int): The minimum size of holes to remove.
    
    Returns:
        numpy.ndarray: The cleaned binary mask with only the largest connected component retained.
    """
    # Ensure the mask is binary (either 0 or 255)
    mask_np = (mask_np > 0).astype(np.uint8) * 255

    # Morphological closing to fill small gaps or holes
    kernel = np.ones((5, 5), np.uint8)  # Adjust kernel size as needed
    closed_mask = cv2.morphologyEx(mask_np, cv2.MORPH_CLOSE, kernel)

    # Convert the closed mask to a boolean mask for hole removal
    bool_mask = closed_mask > 0

    # Remove small holes
    cleaned_mask = morphology.remove_small_holes(bool_mask, area_threshold=min_size)

    # Label connected components
    labeled_mask, num_features = measure.label(cleaned_mask, connectivity=2, return_num=True)

    # Find the largest connected component
    if num_features > 0:
        max_label = max(range(1, num_features + 1), key=lambda label: np.sum(labeled_mask == label))
        cleaned_mask = (labeled_mask == max_label)
    else:
        cleaned_mask = np.zeros_like(cleaned_mask)

    # Convert boolean mask back to uint8
    cleaned_mask = cleaned_mask.astype(np.uint8) * 255

    return cleaned_mask


def merge_shapes(shapes):
    """Merge multiple binary shapes into one."""
    merged_shape = np.zeros_like(shapes[0])
    for shape in shapes:
        merged_shape = cv2.bitwise_or(merged_shape, shape)
    return merged_shape

crazy_neck_color_groups = {
                'neck_color': ['neck'],
                'neck_shadow_color': ['neck_shadow'],
                'hair_color': ['hair'],
                'head_face_color': ['head_face','r_ear', 'l_ear'],
                'eyebrow_color': ['l_brow', 'r_brow'],
                'mouth_color': ['mouth'],
                'upper_lip_color': ['upper_lip'],
                'lower_lip_color': ['lower_lip'],
                'eye_color':['l_eye', 'r_eye'],
                'glasses_color':['eyeglasses'],
                'hat_color': ['hat']
            }

faceless_color_groups = {
                'neck_color': ['neck'],
                'cloth_color': ['cloth'],
                'hair_color': ['hair'],
                'head_face_color': ['head_face','r_ear', 'l_ear'],
                'eyebrow_color': ['l_brow', 'r_brow'],
                'mouth_color': ['mouth'],
                'upper_lip_color': ['upper_lip'],
                'lower_lip_color': ['lower_lip'],
                'necklace_color': ['neck_l'],
                'glasses_color':['eyeglasses'],
                'hat_color': ['hat']
            }

color_groups = {
                'neck_color': ['neck'],
                'cloth_color': ['cloth'],
                'neck_shadow_color': ['neck_shadow'],
                'hair_color': ['hair'],
                'head_face_color': ['head_face','r_ear', 'l_ear'],
                'eyebrow_color': ['l_brow', 'r_brow'],
                'mouth_color': ['mouth'],
                'upper_lip_color': ['upper_lip'],
                'lower_lip_color': ['lower_lip'],
                'eye_color':['l_eye', 'r_eye'],
                'glasses_color':['eyeglasses'],
                'hat_color': ['hat']
            }


line_shapes_layer_order = { 'neck', 'cloth', 'hair', 'head_face','l_brow', 'r_brow', 'mouth', 'upper_lip', 'lower_lip', 'l_eye', 'r_eye', 'neck_l', 'eyeglasses', 'hat'}

face_segments_for_mask = {
    "head_face",
    "l_brow",
    "r_brow",
    "l_eye",
    "r_eye",
    "eyeglasses",
    "l_ear",
    "r_ear",
    "ear_r",
    "nose",
    "mouth",
    "upper_lip",
    "lower_lip",
    "neck",
    "hair",
    "hat"
}
def fix_shape_for_shading(shape):
    # shape is a binary mask (255 for shape, 0 for background)
    # Convert shape to a binary format if it's not
    _, binary_shape = cv2.threshold(shape, 127, 255, cv2.THRESH_BINARY)
    
    # Fill holes using morphological closing
    kernel = np.ones((5, 5), np.uint8)  # Adjust the kernel size as needed for the size of the holes
    closed_shape = cv2.morphologyEx(binary_shape, cv2.MORPH_CLOSE, kernel)
    
    return closed_shape


def add_shape_for_shading(shape_for_shading, canvas):
    
    shape_for_shading = fix_shape_for_shading(shape_for_shading)
    # Find the horizontal center of the white pixels in the shape
    white_coords = np.where(shape_for_shading > 0)
    if white_coords[1].size == 0:  # No white pixels found
        return canvas  # Return the canvas unchanged if no shape is found

    # Calculate the horizontal center
    horizontal_center = shape_for_shading.shape[1] // 2

    # Set the right half of the shape to black
    shape_for_shading[:, horizontal_center:] = 0

    # Invert the mask: white pixels to black and black to white
    inverted_mask = np.where(shape_for_shading > 0, 0, 255).astype(np.uint8)

    # Create a new layer on top of the canvas
    top_layer = np.copy(canvas)
    top_layer[:, :, 0] = cv2.multiply(top_layer[:, :, 0], inverted_mask, scale=0.5/255.0)
    top_layer[:, :, 1] = cv2.multiply(top_layer[:, :, 1], inverted_mask, scale=0.5/255.0)
    top_layer[:, :, 2] = cv2.multiply(top_layer[:, :, 2], inverted_mask, scale=0.5/255.0)

    # Combine the original canvas with the top layer using a blend mode
    # Since we need a 50% effect, we average the original and top layers
    final_canvas = cv2.addWeighted(canvas, 0.8, top_layer, 0.5, 0)

    return final_canvas

def hex_to_bgr(hex_color):
    hex_color = hex_color.lstrip('#')
    lv = len(hex_color)
    return tuple(int(hex_color[i:i + lv // 3], 16) for i in range(0, lv, lv // 3))[::-1]

    
def print_numpy_array_shape(name, npArray):
    dim = npArray.ndim
    shape = npArray.shape
    print(F"{name} has a shape of {shape} and have {dim} number of dimensions")

def drop_shadow(drop_shadow_shape, canvas, x_offset=150, y_offset=0, opacity=40, drop_shadow_color="#FF0000"):  # Use a bright color like red for visibility
    # Clean the mask and fix its shape for shading
    cleaned_drop_shadow_shape = clean_mask(drop_shadow_shape)
    #inverted_mask = np.where(cleaned_drop_shadow_shape > 0, 0, 255).astype(np.uint8)

    # Convert hex color to BGR and apply the color to the drop shadow
    drop_shadow_color_bgr = hex_to_bgr(drop_shadow_color)
    drop_shadow_rgb = np.zeros_like(canvas, dtype=np.uint8)
    for i in range(3):
        drop_shadow_rgb[:, :, i] = (drop_shadow_color_bgr[i] * (cleaned_drop_shadow_shape / 255)).astype(np.uint8)

    # Ensure padded_canvas is large enough
    max_height = y_offset + drop_shadow_rgb.shape[0]
    max_width = x_offset + drop_shadow_rgb.shape[1]
    padded_canvas = np.zeros((max(max_height, canvas.shape[0]), max(max_width, canvas.shape[1]), 3), dtype=np.uint8)

    # Apply the shadow with offset
    padded_canvas[y_offset:y_offset + drop_shadow_rgb.shape[0], x_offset:x_offset + drop_shadow_rgb.shape[1]] = drop_shadow_rgb

    # Blend the shadow onto the original canvas with increased visibility
    alpha = opacity / 100
    final_canvas = cv2.addWeighted(canvas, 1, padded_canvas[:canvas.shape[0], :canvas.shape[1], :], alpha, 0)

    return final_canvas


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
    

def get_face_shape_for_mask(resized_shape):
        # Dynamically access indices and merge shapes
        face_shape_for_mask = merge_shapes([resized_shape[FSI.face_segment_indices[part]] for part in face_segments_for_mask])

        return face_shape_for_mask

class FaceArt:
    def __init__(self, flatfaceoptions):
        self.flatfaceoptions = flatfaceoptions

    @staticmethod
    def hex_to_bgr(hex_value):
        hex_value = hex_value.lstrip('#')
        if len(hex_value) == 6:
            bgr = tuple(int(hex_value[i:i+2], 16) for i in (4, 2, 0))
            return bgr
        else:
            raise ValueError(f"Invalid hex color: {hex_value}")
    
    @staticmethod
    def create_head_shadow_for_neck(head_shape, neck_shape, shift_distance=25):
        # Initialize an empty canvas for the neck"
        neck_shape_combined = np.zeros_like(head_shape, dtype=np.uint8)
        neck_shape_combined = cv2.bitwise_or(neck_shape_combined, neck_shape)

        # Shift the head shape downwards by the specified distance
        M = np.float32([[1, 0, 0], [0, 1, shift_distance]])  # Adjusted translation matrix
        shifted_head_shape = cv2.warpAffine(head_shape, M, (head_shape.shape[1], head_shape.shape[0]))
        
        # Intersect the shifted head shape with the combined neck mask to create the neck shadow shape
        neck_shadow_shape = cv2.bitwise_and(shifted_head_shape, neck_shape_combined)
        return neck_shadow_shape
    
    def create_line_face_drawing(self, segmented_face_tensor, gap_width=12, segment_width=12):
        canvas = np.full((1024, 1024, 3), self.hex_to_bgr(self.flatfaceoptions.background_color), dtype=np.uint8)
        resized_shape = [cv2.resize(shape.astype(np.uint8), (1024, 1024), interpolation=cv2.INTER_NEAREST) for shape in segmented_face_tensor]

        head_index = FSI.face_segment_indices['head_face']
        left_ear_index = FSI.face_segment_indices['l_ear']
        right_ear_index = FSI.face_segment_indices['r_ear']
        right_nose_index = FSI.face_segment_indices['nose']

        head_and_ears_shape = merge_shapes([resized_shape[head_index], resized_shape[left_ear_index], resized_shape[right_ear_index], resized_shape[right_nose_index]])
        resized_shape[head_index] = head_and_ears_shape
        resized_shape[left_ear_index] = np.zeros_like(resized_shape[left_ear_index])
        resized_shape[right_ear_index] = np.zeros_like(resized_shape[right_ear_index])
        resized_shape[right_nose_index] = np.zeros_like(resized_shape[right_nose_index])
        color = self.hex_to_bgr(self.flatfaceoptions.linecolor)

        for line_shapes in line_shapes_layer_order:
            shape_index = FSI.face_segment_indices[line_shapes]
            shape = resized_shape[shape_index]
            contours, _ = cv2.findContours(shape, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                draw_contour = DrawContour(canvas, contours, self.flatfaceoptions.stroke_thickness, gap_width, segment_width, color)
                canvas = draw_contour.draw_contour()
            elif line_shapes == 'head_face' or line_shapes == 'hair':
                print(f"No contours found for part {line_shapes}")
                canvas = None
                break

        return canvas

    def Create_Faceless_drawing(self, segmented_face_tensor):
        canvas = np.full((1024, 1024, 3), self.hex_to_bgr(self.flatfaceoptions.background_color), dtype=np.uint8)
        linecolor = self.flatfaceoptions.linecolor
        resized_shape = [cv2.resize(shape.astype(np.uint8), (1024, 1024), interpolation=cv2.INTER_NEAREST) for shape in segmented_face_tensor]
        if segmented_face_tensor.ndim != 3 or segmented_face_tensor.shape[0] != 19:
                raise ValueError("Output tensor must be of shape [19, H, W]")
        
        head_index = FSI.face_segment_indices['head_face']
        left_ear_index = FSI.face_segment_indices['l_ear']
        right_ear_index = FSI.face_segment_indices['r_ear']
        right_nose_index = FSI.face_segment_indices['nose']

        head_and_ears_shape = merge_shapes([resized_shape[head_index], resized_shape[left_ear_index], resized_shape[right_ear_index], resized_shape[right_nose_index]])
 

        # Dynamically access indices and merge shapes
        shape_for_shading = merge_shapes([resized_shape[FSI.face_segment_indices[part]] for part in face_segments_for_mask])

        resized_shape[head_index] = head_and_ears_shape
        resized_shape[left_ear_index] = np.zeros_like(resized_shape[left_ear_index])  # Clear the left ear shape
        resized_shape[right_ear_index] = np.zeros_like(resized_shape[right_ear_index])  # Clear the right ear shape
        resized_shape[right_nose_index] = np.zeros_like(resized_shape[right_nose_index])  # Clear the nose shape

        for color_attr, parts in faceless_color_groups.items():
            fill_color_hex = getattr(self.flatfaceoptions, color_attr, None)
            if fill_color_hex is None:
                continue
            
            fill_color = self.hex_to_bgr(fill_color_hex)
            for part in parts:
                if part == 'nose':
                    head_shape = resized_shape[FSI.face_segment_indices['head_face']]
                    neck_shape = resized_shape[FSI.face_segment_indices['neck']]
                    shape = self.create_head_shadow_for_neck(head_shape, neck_shape)
                    stroke_thickness = 0
                else:
                    shape_index = FSI.face_segment_indices[part]
                    shape = resized_shape[shape_index]
                    stroke_thickness = self.flatfaceoptions.stroke_thickness
                

                canvas = self.draw(shape, linecolor, fill_color, canvas, stroke_thickness, self.flatfaceoptions.epsilon_factor)
        canvas = add_shape_for_shading(clean_mask(shape_for_shading), canvas )
        return canvas

    def create_artistic_face_drawing(self, segmented_face_tensor, unite_ears_and_head=False, is_lineless = False, crazy_neck = False):
            
            canvas = np.full((1024, 1024, 3), self.hex_to_bgr(self.flatfaceoptions.background_color), dtype=np.uint8)
            linecolor = self.flatfaceoptions.linecolor
            
            if segmented_face_tensor.ndim != 3 or segmented_face_tensor.shape[0] != 19:
                raise ValueError("Output tensor must be of shape [19, H, W]")

            resized_shape = [cv2.resize(shape.astype(np.uint8), (1024, 1024), interpolation=cv2.INTER_NEAREST) for shape in segmented_face_tensor]
            
            if(self.flatfaceoptions.add_drop_shadow):
                drop_shadow_shape = get_face_shape_for_mask(resized_shape)
                canvas = drop_shadow(drop_shadow_shape, canvas, self.flatfaceoptions.x_offset, self.flatfaceoptions.y_offset, self.flatfaceoptions.opacity, self.flatfaceoptions.drop_shadow_color)

            if unite_ears_and_head:
                head_index = FSI.face_segment_indices['head_face']
                left_ear_index = FSI.face_segment_indices['l_ear']
                right_ear_index = FSI.face_segment_indices['r_ear']
                right_nose_index = FSI.face_segment_indices['nose']

                # Merge the head and ears into one shape
                head_and_ears_shape = merge_shapes([resized_shape[head_index], resized_shape[left_ear_index], resized_shape[right_ear_index], resized_shape[right_nose_index]])
                resized_shape[head_index] = head_and_ears_shape
                resized_shape[left_ear_index] = np.zeros_like(resized_shape[left_ear_index])  # Clear the left ear shape
                resized_shape[right_ear_index] = np.zeros_like(resized_shape[right_ear_index])  # Clear the right ear shape
                resized_shape[right_nose_index] = np.zeros_like(resized_shape[right_nose_index])  # Clear the nose shape

            if crazy_neck:
                cg =  crazy_neck_color_groups
            else:
                cg = color_groups

            for color_attr, parts in cg.items():
                fill_color_hex = getattr(self.flatfaceoptions, color_attr, None)
                if fill_color_hex is None:
                    continue

                fill_color = self.hex_to_bgr(fill_color_hex)
                for part in parts:
                    if part == 'neck_shadow':
                        head_shape = resized_shape[FSI.face_segment_indices['head_face']]
                        neck_shape = resized_shape[FSI.face_segment_indices['neck']]
                        shape = self.create_head_shadow_for_neck(head_shape, neck_shape)
                        stroke_thickness = 0
                    else:
                        shape_index = FSI.face_segment_indices[part]
                        shape = resized_shape[shape_index]
                        stroke_thickness = self.flatfaceoptions.stroke_thickness

                    if part == 'nose':
                        stroke_thickness = 0

                    if is_lineless :
                        linecolor = fill_color

                    canvas = self.draw(shape, linecolor, fill_color, canvas, stroke_thickness, self.flatfaceoptions.epsilon_factor)
            return canvas
    
    def draw(self, shape_tensor, stroke, fill_color, canvas, thickness=10, epsilon_factor=0.001):
        # Ensure the color parameters are tuples of integers
        def to_color_tuple(color):
            if isinstance(color, (list, tuple)):
                return tuple(map(int, color[:4]))  # Convert to tuple of integers, max 4 elements
            elif isinstance(color, int):
                return (color,)
            elif isinstance(color, str):
                return self.hex_to_bgr(color)  # Convert hex string to BGR tuple
            else:
                raise ValueError("Color must be a list, tuple, integer, or hex string")
        
        stroke = to_color_tuple(stroke)
        fill_color = to_color_tuple(fill_color)
        
        # Find contours
        contours, _ = cv2.findContours(shape_tensor, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Approximate contours to smooth them
        smooth_contours = [cv2.approxPolyDP(cnt, epsilon_factor * cv2.arcLength(cnt, True), True) for cnt in contours]
        
        # Draw smooth contours
        cv2.drawContours(canvas, smooth_contours, -1, stroke, thickness)
        cv2.drawContours(canvas, smooth_contours, -1, fill_color, cv2.FILLED)
        
        return canvas
    def draw_old(self, shape_tensor, stroke, fill_color, canvas, thickness=10):
        contours, _ = cv2.findContours(shape_tensor, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(canvas, contours, -1, stroke, thickness)
        cv2.drawContours(canvas, contours, -1, fill_color, cv2.FILLED)
        return canvas
