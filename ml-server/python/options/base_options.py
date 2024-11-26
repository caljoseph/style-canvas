class BaseOptions:
    def __init__(self):
        # Experiment specifics
        self.name = 'label2city'
        self.gpu_ids = self.detect_gpus()  # Automatically detect GPUs
        self.checkpoints_dir = './checkpoints'
        self.model = 'pix2pixHD'
        self.norm = 'instance'
        self.use_dropout = False
        self.data_type = 32
        self.verbose = False
        self.fp16 = False
        self.local_rank = 0

        # Input/output sizes
        self.batchSize = 1
        self.loadSize = 1024
        self.fineSize = 512
        self.label_nc = 35
        self.input_nc = 3
        self.output_nc = 3

        # For setting inputs
        self.dataroot = './datasets/cityscapes/'
        self.resize_or_crop = 'scale_width'
        self.serial_batches = False
        self.no_flip = False
        self.nThreads = 2
        self.max_dataset_size = float("inf")

        # For displays
        self.display_winsize = 512
        self.tf_log = False

        # For generator
        self.netG = 'global'
        self.ngf = 64
        self.n_downsample_global = 4
        self.n_blocks_global = 9
        self.n_blocks_local = 3
        self.n_local_enhancers = 1
        self.niter_fix_global = 0

        # For instance-wise features
        self.no_instance = False
        self.instance_feat = False
        self.label_feat = False
        self.feat_num = 3
        self.load_features = False
        self.n_downsample_E = 4
        self.nef = 16
        self.n_clusters = 10

        # Additional test-specific options
        self.ntest = float("inf")
        self.results_dir = './results/'
        self.aspect_ratio = 1.0
        self.phase = 'test'
        self.which_epoch = 'latest'
        self.how_many = 50
        self.cluster_path = 'features_clustered_010.npy'
        self.use_encoded_image = False
        self.export_onnx = None
        self.engine = None
        self.onnx = None

        # By default, assume testing
        self.isTrain = False

    def detect_gpus(self):
        """Handles GPU detection and returns a list of available GPU IDs."""
        try:
            import torch  # Import locally within the method
            num_gpus = torch.cuda.device_count()
            return list(range(num_gpus)) if num_gpus > 0 else []
        except ImportError:
            print("Torch not available. Using CPU.")
            return []

    def get_options(self):
        """Return all options as a dictionary."""
        return self.__dict__.copy()
