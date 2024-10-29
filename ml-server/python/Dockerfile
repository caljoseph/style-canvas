
# Use an official Anaconda base image
FROM continuumio/anaconda3

# Set the working directory in the container
WORKDIR /app

# Copy the environment.yml or requirements.txt file to the container
COPY environment.yml /app/

# Install the dependencies from the environment.yml file
RUN conda env create -f environment.yml

# Activate the conda environment named 'StyleCanvasAI'
RUN echo "conda activate StyleCanvasAI" >> ~/.bashrc
ENV PATH /opt/conda/envs/StyleCanvasAI/bin:$PATH

# Copy the entire project into the container
COPY . /app

# Expose any ports your project uses (e.g., for a web server)
EXPOSE 8000

# Define the entry point for your container
CMD ["python", "your_main_script.py"]
