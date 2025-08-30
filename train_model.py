import tensorflow as tf
from tensorflow.keras import layers, models
import numpy as np
import tensorflowjs as tfjs

# 1. Create a small CNN
model = models.Sequential([
    layers.Conv2D(8, (3,3), activation='relu', input_shape=(64,64,3)),
    layers.MaxPooling2D((2,2)),
    layers.Flatten(),
    layers.Dense(16, activation='relu'),
    layers.Dense(6, activation='softmax')  # 6 outputs for demo
])

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# 2. Generate fake training data (replace with real images if you have them)
X_train = np.random.rand(100, 64, 64, 3)
y_train = tf.keras.utils.to_categorical(np.random.randint(6, size=(100,)), num_classes=6)

# 3. Train the model
model.fit(X_train, y_train, epochs=3)

# 4. Save in TensorFlow.js format
tfjs.converters.save_keras_model(model, "model")
print("Model saved to 'model/' folder.")
