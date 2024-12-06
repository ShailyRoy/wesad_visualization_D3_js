import os
import pickle
import numpy as np
import pandas as pd
import scipy.signal as scisig

# Define paths and constants
BASE_DIR = 'WESAD'  # Adjust to your directory
OUTPUT_FILE = 'processed_participants.csv'
SUBJECT_IDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17]
FS_DICT = {'ACC': 32, 'BVP': 64, 'EDA': 4, 'TEMP': 4}
WINDOW_IN_SECONDS = 30

# Helper functions
def butter_lowpass_filter(data, cutoff, fs, order=5):
    """Apply a lowpass filter to the signal."""
    nyq = 0.5 * fs
    normal_cutoff = cutoff / nyq
    b, a = scisig.butter(order, normal_cutoff, btype='low', analog=False)
    return scisig.lfilter(b, a, data)

def get_statistics(data):
    """Compute basic statistics for a given window of data."""
    return {
        'mean': np.mean(data),
        'std': np.std(data),
        'min': np.min(data),
        'max': np.max(data)
    }

def parse_demographics(main_path, subject_number):
    """Extract demographic metadata from `Sx_readme.txt` files."""
    metadata_file = os.path.join(main_path, f'S{subject_number}', f'S{subject_number}_readme.txt')
    metadata = {"age": None, "height_cm": None, "weight_kg": None, "gender": None, "dominant_hand": None}
    if os.path.exists(metadata_file):
        with open(metadata_file, 'r') as file:
            for line in file:
                if "Age:" in line:
                    metadata["age"] = int(line.split(":")[-1].strip())
                elif "Height (cm):" in line:
                    metadata["height_cm"] = int(line.split(":")[-1].strip())
                elif "Weight (kg):" in line:
                    metadata["weight_kg"] = int(line.split(":")[-1].strip())
                elif "Gender:" in line:
                    metadata["gender"] = line.split(":")[-1].strip()
                elif "Dominant hand:" in line:
                    metadata["dominant_hand"] = line.split(":")[-1].strip()
    return metadata

def process_signal(signal, fs):
    """Divide the signal into windows and compute features."""
    window_size = fs * WINDOW_IN_SECONDS
    n_windows = len(signal) // window_size
    features = []

    for i in range(n_windows):
        window = signal[i * window_size:(i + 1) * window_size]
        stats = get_statistics(window)
        features.append(stats)

    return features

def process_subject(subject_id):
    """Process data for a single subject."""
    subject_name = f'S{subject_id}'
    pkl_file = os.path.join(BASE_DIR, subject_name, f'{subject_name}.pkl')
    
    # Load the .pkl file
    with open(pkl_file, 'rb') as file:
        data = pickle.load(file, encoding='latin1')
    
    # Get demographics
    demographics = parse_demographics(BASE_DIR, subject_id)
    
    # Process wrist signals
    wrist_signals = ['EDA', 'BVP', 'TEMP']
    all_features = []

    for signal_type in wrist_signals:
        if signal_type in data['signal']['wrist']:
            signal = data['signal']['wrist'][signal_type].flatten()  # Ensure 1D array
            filtered_signal = butter_lowpass_filter(signal, cutoff=1.0, fs=FS_DICT[signal_type], order=4)
            features = process_signal(filtered_signal, FS_DICT[signal_type])
            for feature in features:
                feature['signal'] = signal_type
                feature['subject'] = subject_id
                feature.update(demographics)  # Add demographic metadata
            all_features.extend(features)

    return all_features

def main():
    """Main processing function for all subjects."""
    all_features = []

    for subject_id in SUBJECT_IDS:
        print(f'Processing subject {subject_id}...')
        features = process_subject(subject_id)
        all_features.extend(features)

    # Convert to DataFrame and save to CSV
    df = pd.DataFrame(all_features)
    df.to_csv(OUTPUT_FILE, index=False)
    print(f'Data processing complete. Output saved to {OUTPUT_FILE}')

if __name__ == '__main__':
    main()
import pandas as pd

# Load the original dataset
data = pd.read_csv("processed_participants.csv")

# Group by unique subject and retain the first occurrence for demographic data
unique_people = data.groupby("subject").first().reset_index()

# Select relevant columns (adjust based on actual data structure)
unique_people = unique_people[["subject", "age", "gender", "hand", "weight"]]

# Save the filtered data to a new CSV file
unique_people.to_csv("unique_participants.csv", index=False)

print("New CSV with unique participants saved as 'unique_participants.csv'")
