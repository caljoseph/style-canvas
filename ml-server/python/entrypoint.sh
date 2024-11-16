#!/bin/bash

# Activate the Conda environment
source /opt/conda/etc/profile.d/conda.sh
conda activate StyleCanvasAI

# Execute the command passed to the container
exec "$@"
