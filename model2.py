# model2.py

import pandas as pd

# Load and clean the CSV once at module level
df = pd.read_csv('crops.csv')
df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
df['crop'] = df['crop'].str.strip().str.lower()
df.set_index('crop', inplace=True)

def compare_crop_with_expert_advice(crop_name: str, ui_readings: dict) -> str:
    crop_name = crop_name.strip().lower()

    if crop_name not in df.index:
        return f"❌ Crop '{crop_name}' not found in dataset."

    crop_data = df.loc[crop_name]
    messages = []

    def generate_expert_advice(feature, ui_val, crop_val):
        # Thresholds
        if feature == 'temperature':
            threshold = 3
        elif feature == 'soil_ph':
            threshold = 2
        else:
            threshold = 5

        diff = abs(ui_val - crop_val)
        direction = "increase" if ui_val < crop_val else "decrease"

        if diff <= threshold:
            return f"{feature.capitalize()}: ✅ Value is acceptable (Your value: {ui_val}, Ideal: {crop_val}). No action needed."

        # Decide tier
        if diff <= 2 * threshold:
            level = "slight"
        elif diff <= 3 * threshold:
            level = "moderate"
        else:
            level = "significant"

        # Suggestion bank
        suggestions = {
            'temperature': {
                'increase': {
                    'slight': "Use row covers or plant during warmer hours.",
                    'moderate': "Use plastic mulch or low tunnels.",
                    'significant': "Install greenhouse heating or choose a warm season for planting.",
                },
                'decrease': {
                    'slight': "Provide light shading or mulch.",
                    'moderate': "Irrigate during cooler periods and use shade cloth.",
                    'significant': "Install a cooling system or grow in a controlled environment.",
                }
            },
            'soil_ph': {
                'increase': {
                    'slight': "Apply wood ash or lime water to gently raise pH.",
                    'moderate': "Use agricultural lime and retest soil after a week.",
                    'significant': "Apply heavy liming and monitor soil weekly until balanced.",
                },
                'decrease': {
                    'slight': "Use composted pine needles or peat moss to lower pH slightly.",
                    'moderate': "Add elemental sulfur and organic matter to lower pH gradually.",
                    'significant': "Apply aluminum sulfate and acidic fertilizers under close monitoring.",
                }
            },
            'rainfall': {
                'increase': {
                    'slight': "Use basic irrigation like watering cans or hoses.",
                    'moderate': "Install drip or sprinkler systems.",
                    'significant': "Use automated irrigation systems and water harvesting.",
                },
                'decrease': {
                    'slight': "Reduce watering frequency slightly.",
                    'moderate': "Use raised beds and improve drainage.",
                    'significant': "Install drainage systems or grow under cover.",
                }
            },
            'humidity': {
                'increase': {
                    'slight': "Use misting sprays or group plants closer.",
                    'moderate': "Add humidity trays or light irrigation.",
                    'significant': "Use foggers or a greenhouse humidifier.",
                },
                'decrease': {
                    'slight': "Increase spacing between crops.",
                    'moderate': "Improve ventilation with fans.",
                    'significant': "Use a dehumidifier or open-field growing.",
                }
            },
            'nitrogen': {
                'increase': {
                    'slight': "Use compost or manure tea.",
                    'moderate': "Apply urea or ammonium sulfate.",
                    'significant': "Use synthetic nitrogen fertilizers and reapply weekly.",
                },
                'decrease': {
                    'slight': "Stop nitrogen feeding for a few days.",
                    'moderate': "Switch to balanced NPK fertilizer.",
                    'significant': "Plant nitrogen-absorbing cover crops.",
                }
            },
            'phosphorus': {
                'increase': {
                    'slight': "Add bone meal or rock phosphate.",
                    'moderate': "Use superphosphate fertilizer.",
                    'significant': "Apply concentrated phosphate solutions.",
                },
                'decrease': {
                    'slight': "Reduce high-phosphorus fertilizers.",
                    'moderate': "Flush soil with water to leach excess phosphorus.",
                    'significant': "Rotate crops and avoid all P-based inputs.",
                }
            },
            'potassium': {
                'increase': {
                    'slight': "Use banana peel compost or wood ash.",
                    'moderate': "Apply potassium sulfate or muriate of potash.",
                    'significant': "Use strong K-rich fertilizers and test soil regularly.",
                },
                'decrease': {
                    'slight': "Stop potassium fertilization temporarily.",
                    'moderate': "Switch to low-K fertilizer blend.",
                    'significant': "Flush excess potassium with irrigation and rotate crops.",
                }
            },
        }

        advice = suggestions.get(feature, {}).get(direction, {}).get(level, "Consult with a local agronomist.")
        return f"{feature.capitalize()}: Your value is {ui_val}, ideal is {crop_val}. ⚠️ You need to {level}ly {direction} it.\n➡️ Expert advice: {advice}"

    for feature, ui_val in ui_readings.items():
        crop_val = crop_data[feature]
        messages.append(generate_expert_advice(feature, ui_val, crop_val))

    return "\n".join(messages)
