from .test_options import TestOptions

class Enhanced_Face_Parsing(TestOptions):
    def __init__(self,  which_epoch = 'latest'):
        super(Enhanced_Face_Parsing, self).__init__()
        self. which_epoch =  which_epoch
        self.initialize()

    def initialize(self):
        super(Enhanced_Face_Parsing, self).initialize()
        
        # Override default options specific to Face Parsing
        self.parser.set_defaults(
            label_nc=0, 
            no_instance=True, 
            name="Enhanced_Face_Parsing", 
            dataroot='./datasets/', 
            batchSize=1, 
            loadSize= 512, 
            fineSize=256,
            n_local_enhancers = 3,
            which_epoch = self. which_epoch,
            ngf = 128,
            verbose = True
        )
