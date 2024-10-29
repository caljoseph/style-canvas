# Use the official Miniconda3 image as the base
FROM continuumio/miniconda3:latest

# Set the working directory to /app
WORKDIR /app

# Copy the environment.yml file to the working directory
COPY environment.yml .

# Install mamba for faster environment creation and install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        && conda install -n base -c conda-forge mamba \
        && mamba env create -f environment.yml \
        && conda clean --all --yes \
        && apt-get remove -y build-essential \
        && apt-get autoremove -y \
        && rm -rf /var/lib/apt/lists/*

# Activate the environment and make sure it's activated for all subsequent commands
SHELL ["conda", "run", "-n", "Pix2PixTester", "/bin/bash", "-c"]

# Copy the necessary files for the inference service
COPY inference_server.py BetaSchedule.py S2_Parameters.py DiffI2I_S2.py common.py ddpm.py TensorMathTools.py reuseablecustompythonfunctions.py DiffI2I_Inference.py S2ModelConfigurations.py FaceImageProcessor.py Face_Parsing_Model.py Diff_I2I_lib.py ./
COPY options/ ./options/
COPY ldm/ ./ldm/

# Copy the model weights, creating the specific directory structure required
COPY checkpoints/Face_Parsing_Test_2/DiffI2I_S2/diffi2i_s2_Model_971.pth.tar checkpoints/Face_Parsing_Test_2/DiffI2I_S2/

COPY checkpoints/Face_Parsing_Test_2/settings.txt checkpoints/Face_Parsing_Test_2/

# **Add the Conda environment's bin directory to PATH**
ENV PATH /opt/conda/envs/Pix2PixTester/bin:$PATH

# Expose port 8000 for the FastAPI application
EXPOSE 8000

# Define the default command to run the FastAPI application using uvicorn
CMD ["conda", "run", "--no-capture-output", "-n", "Pix2PixTester", "uvicorn", "inference_server:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "debug", "--access-log"]