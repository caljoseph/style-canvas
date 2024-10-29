class FlatFaceOption:
    def __init__(self):
        self.hair_color = None  
        self.head_face_color = None 
        self.eyebrow_color = None 
        self.background_color = None 
        self.hat_color = None
        self.cloth_color = None
        self.neck_shadow_color = None
        self.glasses_color = None
        self.linecolor = None
        self.neck_color = None
        self.upper_lip_color = None 
        self.lower_lip_color = None
        self.mouth_color = None
        self.eye_color = None
        self.necklace_color = None
        self.stroke_thickness = 10
        self.epsilon_factor = 0.00001
        self.add_drop_shadow = False
        self.drop_shadow_color = '#FF0000'
        self.x_offset= 150
        self.y_offset= 0 
        self.opacity= 40

    def __str__(self):
        attrs = ", ".join(f"{key}={getattr(self, key)}" for key in self.__dict__)
        return f"FlatFaceOption({attrs})"
