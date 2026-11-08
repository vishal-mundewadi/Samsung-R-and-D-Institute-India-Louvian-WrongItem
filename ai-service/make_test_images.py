from PIL import Image, ImageDraw

for name, color in [("blue", (30, 60, 200)), ("black", (20, 20, 20))]:
    img = Image.new("RGB", (200, 200), (255, 255, 255))
    ImageDraw.Draw(img).rectangle([40, 40, 160, 160], fill=color)
    img.save(f"{name}.png")
print("created blue.png and black.png")