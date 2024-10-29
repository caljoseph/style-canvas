from .test_options import TestOptions

class FaceParsingOptions(TestOptions):
    def __init__(self, name='D128_Face_Parsing', n_local_enhancers = 1, which_epoch = 'latest', load_size = 512, fineSize = 256, ngf = 64):
        super(FaceParsingOptions, self).__init__()
        self.fineSize = fineSize
        self.loadSize = load_size
        self.name = name
        self.n_local_enhancers = n_local_enhancers
        self. which_epoch =  which_epoch
        self.ngf = ngf
        self.initialize()

    def initialize(self):
        super(FaceParsingOptions, self).initialize()
        
        # Override default options specific to Face Parsing
        self.parser.set_defaults(
            label_nc=0, 
            no_instance=True, 
            name=self.name, 
            dataroot='./datasets/', 
            batchSize=1, 
            loadSize= self.loadSize, 
            fineSize=self.fineSize,
            n_local_enhancers = self.n_local_enhancers,
            which_epoch = self. which_epoch,
            ngf = self.ngf
        )
