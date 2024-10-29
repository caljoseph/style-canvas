from BetaSchedule import BetaSchedule

class S2_Parameters:
    def __init__(self, 
                 Checkpoint_Name="OilPainting", 
                 n_feats=32, 
                 n_encoder_res=3, 
                 img_height=512, 
                 img_width=512, 
                 dim=48, 
                 timesteps=4, 
                 n_denoise_res=5, 
                 beta_schedule=BetaSchedule.COSINE, 
                 bias=False,
                 LayerNorm_type='WithBias'
                 ):
        
        self.Checkpoint_Name = Checkpoint_Name
        self.n_feats = n_feats
        self.n_encoder_res = n_encoder_res
        self.img_height = img_height
        self.img_width = img_width
        self.dim = dim
        self.timesteps = timesteps
        self.n_denoise_res = n_denoise_res
        self.beta_schedule = beta_schedule
        self.bias = bias
        self.LayerNorm_type  = LayerNorm_type

    def __repr__(self):
        return (f"S2_Parameters(Checkpoint_Name={self.Checkpoint_Name}, n_feats={self.n_feats}, "
                f"n_encoder_res={self.n_encoder_res}, img_height={self.img_height}, "
                f"img_width={self.img_width}, dim={self.dim}, timesteps={self.timesteps}, "
                f"n_denoise_res={self.n_denoise_res}, beta_schedule={self.beta_schedule}, "    
                f"bias={self.bias}, LayerNorm_type={self.LayerNorm_type})")
