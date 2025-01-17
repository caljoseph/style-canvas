from S2_Parameters import S2_Parameters

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

    BlockFilter_Parameters = S2_Parameters(
        Checkpoint_Name="BlockFilter_T3", 
        n_feats=64, 
        dim=48, 
        n_encoder_res=6, 
        n_denoise_res=6, 
        timesteps=30, 
        bias = True,
        img_height=512, 
        img_width=512, 
    )

    Comic_CrafterAI_Parameters = S2_Parameters(
        Checkpoint_Name="T2_Fine_Tuning_ComicBook", 
        n_feats=64, 
        dim=48, 
        n_encoder_res=3, 
        n_denoise_res=4, 
        timesteps=25, 
        img_height=512, 
        img_width=512, 
    )

    Comic_CrafterAI_Parameters_T1 = S2_Parameters(
        Checkpoint_Name="T1_Fine_Tuning_ComicBook", 
        n_feats=64, 
        dim=48, 
        n_encoder_res=6, 
        n_denoise_res=6, 
        timesteps=80, 
        bias = True,
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

    HopeArt = S2_Parameters(
        Checkpoint_Name="T2_HopeArt", 
        n_feats=64, 
        dim=48, 
        n_encoder_res=6, 
        n_denoise_res=6, 
        timesteps=30, 
        img_height=512, 
        img_width=512, 
    )

