
import json
import os
import random

titles = [
    "Structure of Void", "Linear Flow", "Echo 2024", "Silent Grid",
    "Analog Noise", "Digital Breath", "Horizon Zero", "Vertical Time",
    "White Noise", "Carbon Cycle", "Gravity Well", "Kinetic Type",
    "Mono Space", "Fluid Geometry", "Abstract Logic", "Neural Dust",
    "Static Motion", "Prime Chaos", "Binary Soul", "Glass Garden",
    "Neon Shadow", "Paper Architecture", "Liquid Metal", "Quantum Dot",
    "Velvet Friction", "Ceramic Sky", "Rust & Bone", "Pixel Rain",
    "Data Fog", "Memory Lane"
]

types = ["Interactive", "Identity", "Installation", "Web", "Mobile", "Exhibition"]
years = ["2024", "2023", "2022", "2021"]

data = []

for i in range(1, 31):
    idx_str = f"{i:02d}"
    
    # Randomize details
    title = titles[i-1] if i-1 < len(titles) else f"Untitled {i}"
    year = random.choice(years)
    p_type = random.choice(types)
    
    item = {
        "id": idx_str,
        "title": title.upper(),
        "year": year,
        "client": f"CLIENT {random.randint(100, 999)}",
        "type": p_type.upper(),
        "description": f"Exploring the relationship between {title.lower()} and user interaction. A study in minimal aesthetics.",
        "assets": [] # Placeholder for images
    }
    data.append(item)

# Sort by Year desc, then ID desc
data.sort(key=lambda x: (x['year'], x['id']), reverse=True)

os.makedirs("assets", exist_ok=True)

with open("data.json", "w") as f:
    json.dump(data, f, indent=2)

print("Generated data.json with 30 items.")
