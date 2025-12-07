
import base64
import os

image_path = "invoice_bg.png"
html_path = "index.html"

try:
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    
    base64_src = f"data:image/png;base64,{encoded_string}"
    
    with open(html_path, "r", encoding="utf-8") as html_file:
        content = html_file.read()
    
    # Replace the file reference with the base64 data URI
    new_content = content.replace("url('invoice_bg.png')", f"url('{base64_src}')")
    
    with open(html_path, "w", encoding="utf-8") as html_file:
        html_file.write(new_content)
        
    print("Successfully embedded invoice_bg.png into index.html")

except Exception as e:
    print(f"Error: {e}")
