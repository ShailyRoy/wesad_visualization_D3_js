Dataset:
The WESAD dataset, publicly available for wearable stress and affect detection research, provides multimodal data collected from 15 participants during a lab study. It includes physiological and motion data from wrist- and chest-worn devices, encompassing sensor modalities such as blood volume pulse, electrocardiogram, electrodermal activity, electromyogram, respiration, body temperature, and three-axis acceleration. The dataset captures three affective states—neutral, stress, and amusement—bridging the gap between earlier lab studies on stress and emotions. Additionally, it features self-reported data from participants, obtained through established questionnaires. Detailed information is available in the dataset's readme file (UCI Machine Learning Repository, n.d.).

**Reference**: UCI Machine Learning Repository. (n.d.). *WESAD: Wearable stress and affect detection*. Retrieved from https://archive.ics.uci.edu/dataset/465/wesad+wearable+stress+and+affect+detection

goal:
A box representing 15 human figures will be displayed, symbolizing participants in the dataset.
The user can select a sensitive attribute (e.g., age, gender, dominant hand) from a dropdown menu.
When an attribute is selected, the participants in the box will be highlighted in different colors based on their group within that attribute (e.g., one color for males, another for females, or different shades for age groups).
If the user hovers over a participant, a tooltip will appear showing that participant’s details, such as their age, gender, and dominant hand.
Visualization of summary statistics of raw data by group. I.e Mean Heart rate, Mean EDA, Mean BVP→ Employ histograms, there will be an option to filter out data eg only compare the summary statistics for wrist worn EDA for women
