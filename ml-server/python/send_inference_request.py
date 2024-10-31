import requests

# Replace with your actual image path
image_path = r"G:\My Drive\All_Deep_Learning_Models\AI_Model_Example\StyleCanvasAI\Test_Image_WrongSizes\IMG_7369.JPG"
url = "http://localhost:8000/infer"  # Endpoint of your FastAPI server

with open(image_path, "rb") as img_file:
    files = {"file": img_file}
    response = requests.post(url, files=files)

# Print the full response text from the server
if response.ok:
    print("Inference result received.")
    with open("output_result.pkl", "wb") as f:
        f.write(response.content)
else:
    print("Error response text:", response.text)  # Prints the full response for debugging
