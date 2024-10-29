from .test_options import TestOptions

class AdobefilterDefaultOptions(TestOptions):
    def __init__(self, ai_model_name = 'VanGogh_OB',  which_epoch = 'latest', ngf = 64, n_local_enhancers = 2, load_size = 1024, fine_size = 512):
        super(AdobefilterDefaultOptions, self).__init__()
        self.loadSize = load_size
        self.fineSize = fine_size
        self.ai_model_name = ai_model_name
        self.n_local_enhancers = n_local_enhancers
        self. which_epoch =  which_epoch
        self.ngf = ngf
        self.initialize()

    def initialize(self):
        super(AdobefilterDefaultOptions, self).initialize()
        self.parser.set_defaults(
            label_nc =0 , 
            no_instance = True, 
            name = self.ai_model_name, 
            dataroot = './datasets/', 
            batchSize = 1, 
            loadSize = self.loadSize, 
            fineSize = self.fineSize,
            n_local_enhancers = self.n_local_enhancers,
            which_epoch = self. which_epoch,
            ngf = self.ngf
        )