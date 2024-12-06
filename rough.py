import os
import pickle

# Define base directory and subject name
BASE_DIR = 'WESAD'  # Adjust path if necessary
subject_number = 2  # For S2
subject_name = f'S{subject_number}'
file_path = os.path.join(BASE_DIR, subject_name, f'{subject_name}.pkl')

# Load the .pkl file
with open(file_path, 'rb') as file:
    data = pickle.load(file, encoding='latin1')  # Load with 'latin1' encoding

# Inspect the data structure
print(f"Type of data: {type(data)}")
print(f"Keys in data: {list(data.keys())}")

# Inspect 'signal' structure
if 'signal' in data:
    print(f"Signal keys: {list(data['signal'].keys())}")
    print(f"Wrist signal keys: {list(data['signal']['wrist'].keys())}")  # Adjust if 'wrist' exists

# Inspect 'label'
if 'label' in data:
    print(f"Label data type: {type(data['label'])}")
    print(f"Label shape: {data['label'].shape if hasattr(data['label'], 'shape') else len(data['label'])}")
print(data)

import pandas as pd

# Load the original dataset
data = pd.read_csv("processed_participants.csv")

# Group by unique subject and retain the first occurrence for demographic data
unique_people = data.groupby("subject").first().reset_index()

# Select relevant columns (adjust based on actual data structure)
unique_people = unique_people[["subject", "age", "gender", "dominant_hand", "weight_kg", "height_cm"]]

# Save the filtered data to a new CSV file
unique_people.to_csv("unique_participants.csv", index=False)

print("New CSV with unique participants saved as 'unique_participants.csv'")
