import React from 'react';
import { TouchableWithoutFeedback, Keyboard, View } from 'react-native';

const DismissKeyboard = ({ children, style }) => (
  <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={[{ flex: 1 }, style]}>
      {children}
    </View>
  </TouchableWithoutFeedback>
);

export default DismissKeyboard;
