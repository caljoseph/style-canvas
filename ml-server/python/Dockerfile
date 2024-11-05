# Use NVIDIA base image with CUDA 11.8 and cuDNN 8
FROM continuumio/miniconda3:latest

# Set working directory
WORKDIR /app

# Copy the environment.yml file
COPY environment.yml .

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget bzip2 build-essential libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# Install Mamba if needed and create the Conda environment
RUN conda install -n base -c conda-forge mamba && \
    mamba env update -f environment.yml && \
    conda clean --all --yes

# Set the Conda environment to PATH
ENV PATH="/opt/conda/envs/StyleCanvasAI/bin:$PATH"

# Activate the environment by default
SHELL ["conda", "run", "-n", "StyleCanvasAI", "/bin/bash", "-c"]

# Copy application files
COPY inference_server.py BetaSchedule.py ImageSaver.py S2_Parameters.py DiffI2I_S2.py common.py ddpm.py TensorMathTools.py reuseablecustompythonfunctions.py DiffI2I_Inference.py S2ModelConfigurations.py FaceImageProcessor.py Face_Parsing_Model.py Diff_I2I_lib.py ./
COPY options/ ./options/
COPY ldm/ ./ldm/
COPY checkpoints/Face_Parsing_Test_2/DiffI2I_S2/diffi2i_s2_Model_971.pth.tar checkpoints/Face_Parsing_Test_2/DiffI2I_S2/
COPY checkpoints/Face_Parsing_Test_2/settings.txt checkpoints/Face_Parsing_Test_2/
COPY Test_Images/IMG_7369.JPG Test_Images/IMG_7369.JPG

# Expose port 8000 for the FastAPI application
EXPOSE 8000

# Set entrypoint for running the server
CMD ["conda", "run", "--no-capture-output", "-n", "StyleCanvasAI", "uvicorn", "inference_server:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "debug"]
