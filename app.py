from flask import Flask, render_template, request, redirect, url_for, send_from_directory, send_file, jsonify
from PIL import Image, ImageOps
import os
import io
from rembg import remove
import base64
from urllib.parse import unquote

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['PROCESSED_FOLDER'] = 'processed'

# Create folders if they don't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        files = request.files.getlist('files')
        filenames = []
        for file in files:
            if file and file.filename:
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
                file.save(filepath)
                filenames.append(file.filename)
        return redirect(url_for('edit_photos', filenames=','.join(filenames)))
    return render_template('index.html')

@app.route('/edit_photos')
def edit_photos():
    filenames = request.args.get('filenames').split(',')
    return render_template('edit_photos.html', filenames=filenames)

@app.route('/remove_background/<filename>', methods=['POST'])
def remove_background(filename):
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    with open(input_path, 'rb') as input_file:
        input_image = input_file.read()
    
    # Remove the background using rembg
    output_image = remove(input_image)
    
    # Save the output image
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    with open(output_path, 'wb') as output_file:
        output_file.write(output_image)
    
    return send_file(output_path, mimetype='image/png')

@app.route('/update_photo/<filename>', methods=['POST'])
def update_photo(filename):
    decoded_filename = unquote(filename)  # Decode the URL-encoded filename

    # Access the uploaded file from the FormData
    if 'croppedImage' not in request.files:
        return "No image file provided", 400

    image_file = request.files['croppedImage']
    
    # Save the image to the uploads folder
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], decoded_filename)
    image_file.save(filepath)

    return send_file(filepath, mimetype='image/jpeg')  # Adjust MIME type if needed

@app.route('/change_background/<filename>', methods=['POST'])
def change_background(filename):
    data = request.get_json()
    color = data.get('color', '#FFFFFF')

    input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    image = Image.open(input_path).convert("RGBA")

    background = Image.new('RGBA', image.size, color)
    image = Image.alpha_composite(background, image)

    output_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    image.save(output_path, format='PNG')

    return send_file(output_path, mimetype='image/png')

@app.route('/add_border/<filename>', methods=['POST'])
def add_border(filename):
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    image = Image.open(input_path).convert("RGBA")

    # Create a new image with the desired borders
    border_color_black = (0, 0, 0, 255)
    border_color_white = (255, 255, 255, 255)
    
    # Add black border
    bordered_image = ImageOps.expand(image, border=10, fill=border_color_black)
    
    # Add white border
    bordered_image = ImageOps.expand(bordered_image, border=10, fill=border_color_white)
    
    # Save the image with borders
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    bordered_image.save(output_path, format='PNG')

    return send_file(output_path, mimetype='image/png')

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/print_photos')
def print_photos():
    filenames = request.args.get('filenames').split(',')
    return render_template('print_photos.html', filenames=filenames)

@app.route('/generate_print_sheet', methods=['POST'])
def generate_print_sheet():
    data = request.get_json()
    counts = data.get('counts')
    filenames = data.get('filenames')
    paper_size = data.get('paperSize', '4x6')

    if not filenames or not counts:
        return jsonify({'error': 'No filenames or counts provided'}), 400

    # Set the sheet size and photo arrangement based on the selected paper size
    if paper_size == 'A4':
        sheet_width, sheet_height = int(8.27 * 300), int(11.69 * 300)  # A4 size at 300 DPI
        photos_per_row = 6
    else:
        sheet_width, sheet_height = int(4 * 300), int(6 * 300)  # 4x6 inches at 300 DPI
        photos_per_row = 3

    photo_width, photo_height = int(1.33 * 300), int(1.5 * 300)  # 1.33x1.5 inches at 300 DPI
    margin = 0  # No margin between photos

    # Calculate total width required for the photos with margins
    total_photo_width = photo_width * photos_per_row
    x_start = (sheet_width - total_photo_width) // 2  # Center photos horizontally
    y_start = margin

    # Create a blank image with white background
    sheet = Image.new('RGBA', (sheet_width, sheet_height), (255, 255, 255, 255))

    x_offset = x_start
    y_offset = y_start

    for count, filename in zip(counts, filenames):
        if not filename:
            continue

        photo_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        if not os.path.exists(photo_path):
            print(f"File not found: {photo_path}")
            continue

        # Open and resize the photo
        photo = Image.open(photo_path).convert("RGBA").resize((photo_width, photo_height))

        for _ in range(count):
            if x_offset + photo_width > sheet_width:
                x_offset = x_start
                y_offset += photo_height

            if y_offset + photo_height > sheet_height:
                break  # No more space on the sheet

            # Paste the photo onto the sheet
            sheet.paste(photo, (x_offset, y_offset))
            x_offset += photo_width

        # Reset x_offset and move to the next row for the next photo type
        x_offset = x_start
        y_offset += photo_height

    # Save the generated sheet to the processed folder
    output_path = os.path.join(app.config['PROCESSED_FOLDER'], 'print_sheet.png')
    sheet.save(output_path, format='PNG')

    return send_from_directory(app.config['PROCESSED_FOLDER'], 'print_sheet.png')

@app.route('/update_edited_photo/<filename>', methods=['POST'])
def update_edited_photo(filename):
    decoded_filename = unquote(filename)  # Decode the URL-encoded filename

    # Access the uploaded file from the FormData
    if 'editedImage' not in request.files:
        return "No edited image file provided", 400

    edited_image_file = request.files['editedImage']
    
    # Save the edited image to the processed folder
    processed_filepath = os.path.join(app.config['UPLOAD_FOLDER'], decoded_filename)
    edited_image_file.save(processed_filepath)

    return send_file(processed_filepath, mimetype='image/jpeg')  # Adjust MIME type if needed

@app.route('/clear_uploads', methods=['POST'])
def clear_uploads():
    # Clear the uploads folder
    for filename in os.listdir(app.config['UPLOAD_FOLDER']):
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                os.rmdir(file_path)
        except Exception as e:
            print(f'Failed to delete {file_path}. Reason: {e}')

    # Clear the processed folder
    for filename in os.listdir(app.config['PROCESSED_FOLDER']):
        file_path = os.path.join(app.config['PROCESSED_FOLDER'], filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                os.rmdir(file_path)
        except Exception as e:
            print(f'Failed to delete {file_path}. Reason: {e}')

    return redirect(url_for('index'))

# if __name__ == '__main__':
#     app.run(host='0.0.0.0', port=5555, debug=False)
stest