import bpy, json
bpy.ops.wm.open_mainfile(filepath='/workspace/scratch/6a4c729be230/PGF/modules/tracked-mortar/blender/major-forms.blend')
bpy.context.scene.cycles.use_denoising=False
bpy.context.scene.cycles.samples=32
bpy.ops.render.render(write_still=True)
print('NEUTRAL_RENDER_SUCCESS')
