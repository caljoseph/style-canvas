from S2_Parameters import S2_Parameters
from BetaSchedule import BetaSchedule

class S2ModelConfigurations:
    SC3_Parameters = S2_Parameters(
        Checkpoint_Name="OilPainting_SC3", 
        n_feats=32, 
        dim=32, 
        n_encoder_res=3, 
        n_denoise_res=4, 
        timesteps=25, 
        img_height=512, 
        img_width=512, 
    )
    
    BugTest_Parameters = S2_Parameters(
        Checkpoint_Name="OilPainting_Bug_Test", 
        n_feats=32, 
        dim=32, 
        n_encoder_res=3, 
        n_denoise_res=4, 
        timesteps=25, 
        img_height=512, 
        img_width=512, 
        beta_schedule=BetaSchedule.LINEAR
    )

    OP3_Parameters = S2_Parameters(
        Checkpoint_Name="OilPainting_3", 
        n_feats=32, 
        dim=32, 
        n_encoder_res=3, 
        n_denoise_res=6, 
        timesteps=50, 
        img_height=512, 
        img_width=512, 
    )

    FaceParsing_T1_Parameters = S2_Parameters(
        Checkpoint_Name="Face_Parsing_Test_1", 
        n_feats=32, 
        dim=32, 
        n_encoder_res=3, 
        n_denoise_res=4, 
        timesteps=25, 
        img_height=512, 
        img_width=512, 
    )

    FaceParsing_T2_Parameters = S2_Parameters(
        Checkpoint_Name="Face_Parsing_Test_2", 
        n_feats=64, 
        dim=48, 
        n_encoder_res=3, 
        n_denoise_res=4, 
        timesteps=25, 
        img_height=512, 
        img_width=512, 
    )

    Pencil_Blur_Parameters = S2_Parameters(
        Checkpoint_Name="T1_Pencil_Face", 
        n_feats=32, 
        dim=32, 
        n_encoder_res=4, 
        n_denoise_res=4, 
        timesteps=25, 
        img_height=512, 
        img_width=512, 
    )

    T3_Verdant_Flame_Parameters = S2_Parameters(
        Checkpoint_Name="T3_Verdant_Flame", 
        n_feats=64, 
        dim=48, 
        n_encoder_res=6, 
        n_denoise_res=6, 
        timesteps=30, 
        img_height=512, 
        img_width=512, 
    )

