import pandas as pd  # Importing pandas for data handling
import joblib  # Importing joblib for model saving/loading
from sklearn.model_selection import train_test_split  # Importing function to split data
from sklearn.ensemble import RandomForestClassifier  # Importing Random Forest model
from sklearn.metrics import accuracy_score, classification_report  # Importing evaluation metrics

# Load the dataset
data = pd.read_csv('Crop_recommendation.csv')

# Define features (independent variables) and target (dependent variable)
X = data[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]  # Feature set
y = data['label']  # Target variable (crop label)

# Split the dataset into training (80%) and testing (20%) subsets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Initialize the Random Forest Classifier model
model = RandomForestClassifier(random_state=42)

# Train the model using the training data
model.fit(X_train, y_train)

# Make predictions
y_pred = model.predict(X_test)

# Evaluate the model's performance
accuracy = accuracy_score(y_test, y_pred)  # Calculate accuracy
report = classification_report(y_test, y_pred)  # Generate detailed classification report

print(f"Accuracy: {accuracy:.2f}")
print("Classification Report:")
print(report)

# Function to predict crop based on input parameters
def recommend_crop(n, p, k, temperature, humidity, ph, rainfall):
    input_data = pd.DataFrame({
        'N': [n], 'P': [p], 'K': [k],
        'temperature': [temperature],
        'humidity': [humidity],
        'ph': [ph], 'rainfall': [rainfall]
    })
    prediction = model.predict(input_data)
    return prediction[0]

# Example usage
example = recommend_crop(90, 42, 43, 20.8, 82.0, 6.5, 202.9)
print(f"Recommended crop: {example}")

model_filename = 'crop_recommendation_model.pkl'
joblib.dump(model, model_filename)
print(f"Model saved as {model_filename}")