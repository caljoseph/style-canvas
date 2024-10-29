import torch
import torch.nn as nn
import torch.nn.functional as F
import numbers
import common as common
from ddpm import DDPM
from einops import rearrange
import TensorMathTools as tmt

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

def to_3d(x):
    return rearrange(x, 'b c h w -> b (h w) c')

def to_4d(x,h,w):
    return rearrange(x, 'b (h w) c -> b c h w',h=h,w=w)

class SimpleGate(nn.Module):
    def forward(self, x1, x2):
        return x1 * x2

class DynamicAttention(nn.Module):
    def __init__(self, dim, n_feats,  bias):
        super(DynamicAttention, self).__init__()
        self.conv1x1_1 = nn.Conv2d(dim, dim *2, kernel_size=1)
        self.dconv3x3 = nn.Conv2d(dim *2, dim * 2, kernel_size=3, padding=1, groups=dim, bias=bias)  # groups=dim for depthwise conv
        self.dconv3x3_2 = nn.Conv2d(dim, dim, kernel_size=3, padding=1, groups=dim, bias=bias)  # groups=dim for depthwise conv
        self.element_wise_multiplication = SimpleGate()
        self.global_avg_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.conv1x1_2 = nn.Conv2d(dim, dim, kernel_size=1)
        self.kernel = nn.Sequential(nn.Linear(n_feats * 4 , dim, bias=False))
        
    def forward(self, f, z):
       
        # Z Pathway
        b, c, h, w = f.shape
        z_linear = self.kernel(z).view(-1, c, 1, 1)
        # F Pathway 1 (Skip Connection)
        skip_connection = f
        # F Pathway 2
        f_conv1 = self.conv1x1_1(f)
        f_dconv = self.dconv3x3(f_conv1)
        # Split and SimpleGate
        f1, f2 = f_dconv.chunk(2, dim=1)
        f_sg = self.element_wise_multiplication(f1, f2)
       
        # Global Average Pooling and Conv 1x1
        f_gap = self.global_avg_pool(f_sg)

        f_conv2 = self.conv1x1_2(f_gap)
        
        # Element-wise multiplication
        f_ca = self.element_wise_multiplication(f_conv2, f_sg)
        f_ca = self.dconv3x3_2(f_ca)
        # Combine paths
        f_combined = f_ca + z_linear
        
        # Final output with skip connection
        output = f_combined + skip_connection
        
        return output

class BiasFree_LayerNorm(nn.Module):
    def __init__(self, normalized_shape):
        super(BiasFree_LayerNorm, self).__init__()
        if isinstance(normalized_shape, numbers.Integral):
            normalized_shape = (normalized_shape,)
        normalized_shape = torch.Size(normalized_shape)

        assert len(normalized_shape) == 1

        self.weight = nn.Parameter(torch.ones(normalized_shape))
        self.normalized_shape = normalized_shape

    def forward(self, x):
        sigma = x.var(-1, keepdim=True, unbiased=False)
        return x / torch.sqrt(sigma+1e-5) * self.weight

class WithBias_LayerNorm(nn.Module):
    def __init__(self, normalized_shape):
        super(WithBias_LayerNorm, self).__init__()
        if isinstance(normalized_shape, numbers.Integral):
            normalized_shape = (normalized_shape,)
        normalized_shape = torch.Size(normalized_shape)

        assert len(normalized_shape) == 1

        self.weight = nn.Parameter(torch.ones(normalized_shape))
        self.bias = nn.Parameter(torch.zeros(normalized_shape))
        self.normalized_shape = normalized_shape

    def forward(self, x):
        mu = x.mean(-1, keepdim=True)
        sigma = x.var(-1, keepdim=True, unbiased=False)
        return (x - mu) / torch.sqrt(sigma+1e-5) * self.weight + self.bias

class LayerNorm(nn.Module):
    def __init__(self, dim, LayerNorm_type):
        super(LayerNorm, self).__init__()
        if LayerNorm_type =='BiasFree':
            self.body = BiasFree_LayerNorm(dim)
        else:
            self.body = WithBias_LayerNorm(dim)

    def forward(self, x):
        h, w = x.shape[-2:]
        return to_4d(self.body(to_3d(x)), h, w)

class DynamicFeedForwardNetwork(nn.Module):
    def __init__(self, dim, n_feats , ffn_expansion_factor, bias):
        super(DynamicFeedForwardNetwork, self).__init__()
        hidden_features = int(dim * round(ffn_expansion_factor * dim / dim))
        self.project_in = nn.Conv2d(dim, hidden_features * 2, kernel_size=1)
        self.dconv3x3 = nn.Conv2d(hidden_features * 2, hidden_features * 2, kernel_size=3, padding=1, groups=hidden_features * 2, bias=bias) 
        self.project_out = nn.Conv2d(hidden_features, dim, kernel_size=3, padding=1, groups=1, bias=bias)  
        self.element_wise_multiplication = SimpleGate()
        self.Linear = nn.Sequential(nn.Linear(n_feats * 4, dim, bias=False))
    def forward(self, f, z):
        # Z Pathway
        b, c, h, w = f.shape
        z_linear = self.Linear(z).view(-1, c, 1, 1)
        
        # F Pathway 1
        skip_connection = f
        
        # F Pathway 2
        f_conv1 = self.project_in(f)
        f_dconv = self.dconv3x3(f_conv1)
       
        # Split and SimpleGate
        f1, f2 = f_dconv.chunk(2, dim=1)
        f_sg = self.element_wise_multiplication(f1, f2)
        
        f_dconv2  = self.project_out(f_sg)
        f_combined = f_dconv2 + z_linear
        
        # Final output with skip connection
        output = f_combined + skip_connection
        
        return output

class DynamicTransformerBlock(nn.Module):
    def __init__(self,  dim, n_feats, ffn_expansion_factor, bias, LayerNorm_type):
        super(DynamicTransformerBlock, self).__init__()
        self.norm1 = LayerNorm(dim, LayerNorm_type)
        self.da = DynamicAttention(dim, n_feats, bias)
        self.norm2 = LayerNorm(dim, LayerNorm_type)
        self.dffn = DynamicFeedForwardNetwork(dim, n_feats, ffn_expansion_factor, bias)
    
    def forward(self, y):
        x = y[0]
        k_v=y[1]
        x = x + self.da(self.norm1(x),k_v)
        x = x + self.dffn(self.norm2(x),k_v)
        return [x,k_v]

class CPEN(nn.Module):
    def __init__(self, input_channels, n_feats=64, n_encoder_res=6):
        super(CPEN, self).__init__()
        E1 = [nn.Conv2d(input_channels, n_feats, kernel_size=3, padding=1),
              nn.LeakyReLU(0.1, True)]
        
        E2 = [common.ResBlock(common.default_conv, n_feats, kernel_size=3) for _ in range(n_encoder_res)]

        E3 = [
            nn.Conv2d(n_feats, n_feats * 2, kernel_size=3, padding=1),
            nn.LeakyReLU(0.1, True),
            nn.Conv2d(n_feats * 2, n_feats * 2, kernel_size=3, padding=1),
            nn.LeakyReLU(0.1, True),
            nn.Conv2d(n_feats * 2, n_feats * 4, kernel_size=3, padding=1),
            nn.LeakyReLU(0.1, True),
            nn.AdaptiveAvgPool2d(1),
        ]
        E = E1 + E2 + E3
        self.E = nn.Sequential(*E)

        self.linear = nn.Sequential(
            nn.Linear(n_feats * 4, n_feats * 4),
            nn.LeakyReLU(0.1, True)
        )
      
    def forward(self, x):
        fea = self.E(x).squeeze(-1).squeeze(-1)
        S1_IPR = []
        fea1 = self.linear(fea)
        S1_IPR.append(fea1)
        return fea1

class Downsample(nn.Module):
    def __init__(self, n_feat):
        super(Downsample, self).__init__()

        self.body = nn.Sequential(nn.Conv2d(n_feat, n_feat//2, kernel_size=3, stride=1, padding=1, bias=False),
                                  nn.PixelUnshuffle(2))

    def forward(self, x):
        return self.body(x)

class Upsample(nn.Module):
    def __init__(self, n_feat):
        super(Upsample, self).__init__()

        self.body = nn.Sequential(nn.Conv2d(n_feat, n_feat*2, kernel_size=3, stride=1, padding=1, bias=False),
                                  nn.PixelShuffle(2))

    def forward(self, x):
        return self.body(x)

class ResMLP(nn.Module):
    def __init__(self, input_channels=64, output_channels=64):
        super(ResMLP, self).__init__()
        self.resmlp = nn.Sequential(
            nn.Linear(input_channels, output_channels),
            nn.LeakyReLU(0.1, True),
        )

    def forward(self, x):
        res = self.resmlp(x)
        return res

class denoise(nn.Module):
    def __init__(self, n_feats=64, n_denoise_res=5, timesteps=5):
        super(denoise, self).__init__()
        self.max_period = timesteps * 10
        n_featsx4 = 4 * n_feats * 3  # 4C'
        
        # Instantiate ResMLP modules
        self.ResMLPx4 = ResMLP(n_featsx4, n_featsx4)
        self.ResMLP = ResMLP(n_featsx4, n_feats * 4)
        
        # Create a list of layers for the sequential model
        resmlp = []
        for _ in range(n_denoise_res):
            resmlp.append(self.ResMLPx4)  # Append the layer itself, not its forward method
        
        resmlp.append(self.ResMLP)  # Append the final layer
        
        # Use nn.Sequential to chain the layers
        self.resmlp = nn.Sequential(*resmlp)

    def forward(self, Z_t, t, D):
        batch_size = Z_t.size(0)
        num_channels = Z_t.size(1)  # Get the number of channels

        # Normalize and expand the timestep
        t = t.float() / self.max_period
        t = t.view(batch_size, 1)  # Shape [batch_size, 1]
        t = t.expand(batch_size, num_channels)  # Expand to [batch_size, num_channels]

        # Concatenate Z_t, t, and D along the channel dimension
        c = torch.cat([Z_t, t, D], dim=1)  # Resulting shape: [batch_size, 4C' * 2 + 1]
       
        # Pass through the MLP"
        fea = self.resmlp(c)  # Input already flattened to [batch_size, -1] by concatenation
        return fea

class OverlapPatchEmbed(nn.Module):
    def __init__(self, in_c=3, embed_dim=48, bias=False):
        super(OverlapPatchEmbed, self).__init__()

        self.proj = nn.Conv2d(in_c, embed_dim, kernel_size=3, stride=1, padding=1, bias=bias)

    def forward(self, x):
        x = self.proj(x)
        return x

class DI2Iformer(nn.Module):
    def __init__(self, 
        inp_channels=3, 
        out_channels=3, 
        dim = 48,
        n_feats = 64,
        num_blocks = [4,6,6,8], 
        num_refinement_blocks = 4,
        ffn_expansion_factor = 2.66,
        bias = False,
        LayerNorm_type = 'WithBias',   ## Other option 'BiasFree'
        dual_pixel_task = False        ## True for dual-pixel defocus deblurring only. Also set inp_channels=6
    ):

        super(DI2Iformer, self).__init__()

        self.patch_embed = OverlapPatchEmbed(inp_channels, dim)

        self.encoder_level1 = nn.Sequential(*[DynamicTransformerBlock(dim=dim,n_feats = n_feats,  ffn_expansion_factor=ffn_expansion_factor, bias=bias, LayerNorm_type=LayerNorm_type) for i in range(num_blocks[0])])
        
        self.down1_2 = Downsample(dim) ## From Level 1 to Level 2
        self.encoder_level2 = nn.Sequential(*[DynamicTransformerBlock(dim=int(dim*2**1), n_feats = n_feats, ffn_expansion_factor=ffn_expansion_factor, bias=bias, LayerNorm_type=LayerNorm_type) for i in range(num_blocks[1])])
        
        self.down2_3 = Downsample(int(dim*2**1)) ## From Level 2 to Level 3
        self.encoder_level3 = nn.Sequential(*[DynamicTransformerBlock(dim=int(dim*2**2), n_feats = n_feats, ffn_expansion_factor=ffn_expansion_factor, bias=bias, LayerNorm_type=LayerNorm_type) for i in range(num_blocks[2])])

        self.down3_4 = Downsample(int(dim*2**2)) ## From Level 3 to Level 4
        self.latent = nn.Sequential(*[DynamicTransformerBlock(dim=int(dim*2**3),n_feats = n_feats, ffn_expansion_factor=ffn_expansion_factor, bias=bias, LayerNorm_type=LayerNorm_type) for i in range(num_blocks[3])])
        
        self.up4_3 = Upsample(int(dim*2**3)) ## From Level 4 to Level 3
        self.reduce_chan_level3 = nn.Conv2d(int(dim*2**3), int(dim*2**2), kernel_size=1, bias=bias)
        self.decoder_level3 = nn.Sequential(*[DynamicTransformerBlock(dim=int(dim*2**2),n_feats = n_feats, ffn_expansion_factor=ffn_expansion_factor, bias=bias, LayerNorm_type=LayerNorm_type) for i in range(num_blocks[2])])


        self.up3_2 = Upsample(int(dim*2**2)) ## From Level 3 to Level 2
        self.reduce_chan_level2 = nn.Conv2d(int(dim*2**2), int(dim*2**1), kernel_size=1, bias=bias)
        self.decoder_level2 = nn.Sequential(*[DynamicTransformerBlock(dim=int(dim*2**1), n_feats = n_feats, ffn_expansion_factor=ffn_expansion_factor, bias=bias, LayerNorm_type=LayerNorm_type) for i in range(num_blocks[1])])
        
        self.up2_1 = Upsample(int(dim*2**1))  ## From Level 2 to Level 1  (NO 1x1 conv to reduce channels)

        self.decoder_level1 = nn.Sequential(*[DynamicTransformerBlock(dim=int(dim*2**1), n_feats = n_feats, ffn_expansion_factor=ffn_expansion_factor, bias=bias, LayerNorm_type=LayerNorm_type) for i in range(num_blocks[0])])
        
        self.refinement = nn.Sequential(*[DynamicTransformerBlock(dim=int(dim*2**1), n_feats = n_feats, ffn_expansion_factor=ffn_expansion_factor, bias=bias, LayerNorm_type=LayerNorm_type) for i in range(num_refinement_blocks)])
        
        self.dual_pixel_task = dual_pixel_task
        if self.dual_pixel_task:
            self.skip_conv = nn.Conv2d(dim, int(dim*2**1), kernel_size=1, bias=bias)
            
        self.output = nn.Conv2d(int(dim*2**1), out_channels, kernel_size=3, stride=1, padding=1, bias=bias)

    def forward(self, inp_img,k_v):
        inp_enc_level1 = self.patch_embed(inp_img)
        out_enc_level1,_ = self.encoder_level1([inp_enc_level1,k_v])
        inp_enc_level2 = self.down1_2(out_enc_level1)
        out_enc_level2,_ = self.encoder_level2([inp_enc_level2,k_v])
        inp_enc_level3 = self.down2_3(out_enc_level2)
        out_enc_level3,_ = self.encoder_level3([inp_enc_level3,k_v]) 
        inp_enc_level4 = self.down3_4(out_enc_level3)        
        latent,_ = self.latent([inp_enc_level4,k_v])            
        inp_dec_level3 = self.up4_3(latent)
        inp_dec_level3 = torch.cat([inp_dec_level3, out_enc_level3], 1)
        inp_dec_level3 = self.reduce_chan_level3(inp_dec_level3)
        out_dec_level3,_ = self.decoder_level3([inp_dec_level3,k_v]) 
        inp_dec_level2 = self.up3_2(out_dec_level3)
        inp_dec_level2 = torch.cat([inp_dec_level2, out_enc_level2], 1)
        inp_dec_level2 = self.reduce_chan_level2(inp_dec_level2)
        out_dec_level2,_ = self.decoder_level2([inp_dec_level2,k_v]) 
        inp_dec_level1 = self.up2_1(out_dec_level2)
        inp_dec_level1 = torch.cat([inp_dec_level1, out_enc_level1], 1)
        out_dec_level1,_ = self.decoder_level1([inp_dec_level1,k_v])
        
        out_dec_level1,_ = self.refinement([out_dec_level1,k_v])

        if self.dual_pixel_task:
            out_dec_level1 = out_dec_level1 + self.skip_conv(inp_enc_level1)
            out_dec_level1 = self.output(out_dec_level1)
        else:
            out_dec_level1 = self.output(out_dec_level1) #+ inp_img


        return out_dec_level1

class DiffI2I_S2(nn.Module):
    def __init__(self, n_feats=64, n_encoder_res=6, dim=48,  timesteps=4, n_denoise_res=1, image_height = 256, image_width = 256, beta_schedule="linear", bias=False, LayerNorm_type='WithBias',  num_blocks=[4, 6, 6, 8], num_refinement_blocks=4, inp_channels=3, out_channels=3,  linear_start=0.1, linear_end=0.99):
        super(DiffI2I_S2, self).__init__()
        self.G = DI2Iformer(inp_channels, out_channels, dim, n_feats, num_blocks, num_refinement_blocks, 2.66, bias, LayerNorm_type)
        self.condition = CPEN(tmt.GetPixelUnshuffleX4Channels(inp_channels) ,n_feats, n_encoder_res)
        self.pixel_unshuffle = nn.PixelUnshuffle(4)
        self.denoise = denoise(n_feats=n_feats, n_denoise_res=n_denoise_res, timesteps=timesteps)
        self.diffusion = DDPM(
            denoise = self.denoise, 
            condition=self.condition,  
            timesteps = timesteps,
            beta_schedule = beta_schedule,
            image_height = image_height,
            image_width = image_width,
            n_feats=n_feats,
            linear_start=linear_start, 
            linear_end=linear_end
        )

    def forward(self, img, deg_prepT=None):
        if self.training:
            IPR, pred_deg_list = self.diffusion(self.pixel_unshuffle(img), deg_prepT)
            sr = self.G(img, IPR)
            return sr, pred_deg_list
        else:
            IPR=self.diffusion(self.pixel_unshuffle(img))
            sr = self.G(img, IPR)
            return sr

# Example usage
if __name__ == "__main__":
    n_feats = 16
    n_encoder_res = 6
    image_size = 256
    dim=48  
    timesteps=4 
    n_denoise_res=1
    I_input = torch.randn(1, 3,image_size, image_size)
    I_input = I_input.to(DEVICE)
    IPRS1 = torch.randn(1, 4* n_feats)
    IPRS1 = IPRS1.to(DEVICE)
    diffi2i_s2 = DiffI2I_S2(n_feats, n_encoder_res, dim,  timesteps, n_denoise_res, image_size, image_size )
    diffi2i_s2 = diffi2i_s2.to(DEVICE)
    diffi2i_s2 = diffi2i_s2.eval()
    I_output = diffi2i_s2(I_input)
    if isinstance(I_output, tuple):  # Check if training mode
        I_output = I_output[0]  # Get the first element in training mode
        
    print("I_output shape:", I_output.shape)
