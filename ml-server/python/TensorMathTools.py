def CalculatePixelShuffleChannels(pixel_shuffle, channels):
 return  (pixel_shuffle *  pixel_shuffle) // channels

def CalculatePixelUnshuffleChannels(pixel_shuffle, channels):
 return  (pixel_shuffle *  pixel_shuffle) * channels

def GetPixelUnshuffleX4Channels(channels):
 return  16 * channels