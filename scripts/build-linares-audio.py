"""Original cable and industrial transformer cues, matched to engine timing."""
from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path
spec=spec_from_file_location('electrical',Path(__file__).with_name('build-tren-audio.py'))
audio=module_from_spec(spec);spec.loader.exec_module(audio)
audio.build('cable',.92,[(0,.16,'spark',.25),(.19,.13,'zap',.85),(.25,.38,'buzz',.45),(.52,.16,'spark',.4)])
audio.build('cableImpact',.65,[(0,.28,'zap',1.2),(0,.4,'thunder',.5),(.18,.15,'spark',.6),(.37,.17,'spark',.3)])
audio.build('transformerSuper',3.1,[(0,.42,'shing',.9),(.25,1.8,'buzz',1.0),(.65,1.2,'thunder',.4),(1.1,.3,'zap',.6),(1.5,.3,'zap',.8),(2.05,1.0,'thunder',1.4),(2.05,.68,'zap',1.2),(2.4,.3,'spark',.65),(2.65,.4,'thunder',.6)])
