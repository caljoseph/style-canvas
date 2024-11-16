
import style_canvas_utils as scu
from DiffI2I_S2 import DiffI2I_S2
import os
import torch
from S2_Parameters import S2_Parameters

class DiffI2IManager:
    def __init__(self, parameters: S2_Parameters):
        self.parameters = parameters
        self.CHECKPOINT_DIFFI2I_S2 = r"./checkpoints/OilPainting_DiffI2I/DiffI2I_S2/diffi2i_s2_Model_"
        self.CHECKPOINT_DIFFI2I_S2_DIR = r"./checkpoints/OilPainting_DiffI2I/DiffI2I_S2"
        self.setting_file_path = r"./checkpoints/OilPainting_DiffI2I/settings.txt"
        self.Diffi2i_S2 = None  # This will store the model after initialization
        self.device = scu.DEVICE

        # Update paths and initialize the Diffi2i_S2 model
        self.update_global_paths_with_folder(parameters.Checkpoint_Name)
        self.initialize_model()

    def update_global_paths_with_folder(self, folder_name):
        self.CHECKPOINT_DIFFI2I_S2 = self.CHECKPOINT_DIFFI2I_S2.replace("OilPainting_DiffI2I", folder_name)
        self.CHECKPOINT_DIFFI2I_S2_DIR = self.CHECKPOINT_DIFFI2I_S2_DIR.replace("OilPainting_DiffI2I", folder_name)
        self.setting_file_path = self.setting_file_path.replace("OilPainting_DiffI2I", folder_name)

        # Ensure directories exist for each updated path
        paths = [self.CHECKPOINT_DIFFI2I_S2_DIR]
        for path in paths:
            if not os.path.exists(path):
                os.makedirs(path)

    def manage_settings(self):
        default_settings = {
            "LEARNING_RATE": 1e-4,
            "LOAD_MODEL": False,
            "NUM_EPOCHS": 200,
            "saved_count": 0,
            "diffi2i_s2_initialize": False,
            "diffi2i_s1_num": 0
        }

        settings = {}
        if os.path.exists(self.setting_file_path):
            with open(self.setting_file_path, 'r') as file:
                for line in file:
                    line = line.strip()
                    if line and " = " in line:
                        key, value = line.split(" = ", 1)
                        if key in default_settings:
                            if key == "LEARNING_RATE":
                                settings[key] = float(value)
                            elif key == "LOAD_MODEL":
                                settings[key] = value == "True"
                            elif key == "NUM_EPOCHS":
                                settings[key] = int(value)
                            elif key == "saved_count":
                                settings[key] = int(value)
                            elif key == "diffi2i_s2_initialize":
                                settings[key] = value == "True"
                            elif key == "diffi2i_s1_num":
                                settings[key] = int(value)
        else:
            settings = default_settings
            with open(self.setting_file_path, 'w') as file:
                for key, value in settings.items():
                    file.write(f"{key} = {value}\n")

        return settings

    def initialize_model(self):
        settings = self.manage_settings()
        saved_count = settings["saved_count"]
        loadpoint_diffI2I_S2 = self.CHECKPOINT_DIFFI2I_S2 + str(saved_count) + ".pth.tar"
        print(f"Loading checkpoint: {loadpoint_diffI2I_S2}")
        self.Diffi2i_S2 = self.Get_Diffi2i_S2(loadpoint_diffI2I_S2)
        print("Model loaded and ready for inference.")


    def Get_Diffi2i_S2(self, loadpoint_diffI2I):
        diffi2i = DiffI2I_S2(self.parameters.n_feats,
                             self.parameters.n_encoder_res,
                             self.parameters.dim,
                             self.parameters.timesteps,
                             self.parameters.n_denoise_res,
                             self.parameters.img_height,
                             self.parameters.img_width,
                             self.parameters.beta_schedule,
                             self.parameters.bias,
                             self.parameters.LayerNorm_type)
        diffi2i = diffi2i.to(self.device)  # Move model to the same device as input (GPU or CPU)
        diffi2i = scu.setup_gpus(diffi2i)
        scu.load_checkpoint(loadpoint_diffI2I, diffi2i)
        diffi2i = diffi2i.eval()
        return diffi2i

    def run_Diffi2i_S2(self, img):
        img = img.to(self.device)  # Move image tensor to the same device as the model (GPU or CPU)
        with torch.no_grad():  # Ensure no gradient tracking during inference
            y = self.Diffi2i_S2(img)  # Run the model on the input image
        if torch.cuda.is_available():  # Check if CUDA is available
            torch.cuda.synchronize()  # Ensure all CUDA operations are finished
            torch.cuda.empty_cache()  # Clear the CUDA cache to free up memory
        return y



